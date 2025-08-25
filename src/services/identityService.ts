import pool from "../config/database";
import {Contact,identifyRequest,identifyResponse} from '../models/Contact';

export class IdentityService{
    async identify(request:identifyRequest):Promise<identifyResponse>{
        const {email,phoneNumber} = request;
        if(!email && !phoneNumber){
            throw new Error('Either email or phoneNumber must be provided');
        }
        const existingContacts = await this.findExistingContacts(email,phoneNumber);
        if(existingContacts.length === 0){
            const newContact = await this.createPrimaryContact(email,phoneNumber);
            return this.buildResponse([newContact]);
        }

        const allLinkedContacts = await this.getAllLinkedContacts(existingContacts);
        const needNewContact = this.shouldCreateNewContact(allLinkedContacts,email,phoneNumber);

        if(needNewContact){
            const primaryContact = this.findPrimaryContact(allLinkedContacts);
            const newSecondaryContact = await this.createSecondaryContact(
                email,
                phoneNumber,
                primaryContact.id
            );
            allLinkedContacts.push(newSecondaryContact);
        }
        const updatedContacts = await this.handlePrimaryContactLinking(allLinkedContacts,email,phoneNumber);
        return this.buildResponse(updatedContacts);

    }

    private async findExistingContacts(email?:string,phoneNumber?:string): Promise<Contact[]>{
        const query = `
            SELECT * FROM contacts
            WHERE deleted_at IS NULL 
            AND (($1:: text IS NOT NULL AND email = $1) OR ($2:: text IS NOT NULL AND phone_number = $2))
        `;

        const result = await pool.query(query,[email || null, phoneNumber || null]);
        return result.rows.map(this.mapRowToContact);
    }

    private async getAllLinkedContacts(contacts:Contact[]):Promise<Contact[]>{
        if(contacts.length===0) return [];

        const contactIds = new Set<number>();
        for(const contact of contacts){
            contactIds.add(contact.id);
            console.log('Found linkedId:', contact.linkedId);
            if(contact.linkedId){
                contactIds.add(contact.linkedId);
            }
        }

        const query = `
            SELECT * FROM contacts 
            WHERE deleted_at IS NULL
            AND (id = ANY($1::int[]) OR linked_id = ANY($1::int[]))
            ORDER BY created_at ASC;
        `;

        const result = await pool.query(query,[Array.from(contactIds)]);
        return result.rows.map(this.mapRowToContact);

    }

    private shouldCreateNewContact(contacts:Contact[],email?:string,phoneNumber?:string):boolean{
        const exactMatch = contacts.find(contact=>
            contact.email === email && contact.phoneNumber === phoneNumber
        );

        if(exactMatch) return false;

        const hasNewEmail = email && !contacts.some(c=>c.email === email);
        const hasNewPhone = phoneNumber && !contacts.some(c=>c.phoneNumber === phoneNumber);

        return hasNewEmail || hasNewPhone;
    }

    private async handlePrimaryContactLinking(contacts: Contact[],email?:string,phoneNumber?:string): Promise<Contact[]> {
        
        const matchingContacts = contacts.filter(contact=>
               (email && contact.email === email) || (phoneNumber && contact.phoneNumber === phoneNumber)
            );

        const primaryContacts = contacts.filter(c => c.linkPrecedence === 'primary');

        if(primaryContacts.length > 1){
            const oldestPrimary = primaryContacts.reduce((oldest,current)=>
                current.createdAt < oldest.createdAt ? current : oldest
            );

            for(const primary of primaryContacts){
                if(primary.id !== oldestPrimary.id){
                    await this.convertToSecondary(primary.id,oldestPrimary.id);
                    primary.linkedId = oldestPrimary.id;
                    primary.linkPrecedence = 'secondary';
                    primary.updatedAt = new Date();
                }
            }
        }
        return contacts;
    }

    private async createPrimaryContact(email?: string,phoneNumber?:string): Promise<Contact>{
        const query = `
            INSERT INTO contacts (email,phone_number,link_precedence,created_at,updated_at)
            VALUES ($1,$2,'primary',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const result = await pool.query(query,[email || null,phoneNumber || null]);
        return this.mapRowToContact(result.rows[0]);
    }

    private async createSecondaryContact(email?: string,phoneNumber?: string, linkedId?: number):Promise<Contact>{
        const query = `
                INSERT INTO contacts (email,phone_number,linked_id,link_precedence,created_at,updated_at)
                VALUES ($1,$2,$3,'secondary',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                RETURNING *
            `
        const result = await pool.query(query,[email || null,phoneNumber || null,linkedId]);
        return this.mapRowToContact(result.rows[0]);
    }

    private async convertToSecondary(contactId:number,linkedId: number): Promise<void>{
        const query = `
            UPDATE contacts
            SET linked_id = $1, link_precedence = 'secondary', updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;

        await pool.query(query,[linkedId,contactId]);
    }

    private findPrimaryContact(contacts: Contact[]):Contact {
        return contacts.find(c=>c.linkPrecedence === 'primary') || contacts[0];

    }

    private buildResponse(contacts: Contact[]):identifyResponse{
        const primaryContact = this.findPrimaryContact(contacts);
        const secondaryContacts = contacts.filter(c=>c.linkPrecedence === 'secondary');

        const emails = Array.from(new Set(
            contacts
            .filter(c=>c.email)
            .map(c=>c.email!)
        ));

        const phoneNumbers  = Array.from(new Set(
            contacts
            .filter(c=>c.phoneNumber)
            .map(c=>c.phoneNumber!)
        ));

        if(primaryContact.email && emails.includes(primaryContact.email)){
            emails.splice(emails.indexOf(primaryContact.email),1);
            emails.unshift(primaryContact.email);
        }

        if(primaryContact.phoneNumber && phoneNumbers.includes(primaryContact.phoneNumber)){
            phoneNumbers.splice(phoneNumbers.indexOf(primaryContact.phoneNumber),1);
            phoneNumbers.unshift(primaryContact.phoneNumber);
        }

        return {
            contact:{
                primaryContactId: primaryContact.id,
                emails,
                phoneNumbers,
                secondaryContactIds:secondaryContacts.map(c=>c.id)
            }
        };
    }

    private mapRowToContact(row: any): Contact{
        return {
            id: row.id,
            phoneNumber: row.phone_number,
            email:row.email,
            linkedId: row.linked_id,
            linkPrecedence: row.link_precedence,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at
        }
    }



    


}
