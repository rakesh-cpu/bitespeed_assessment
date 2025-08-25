export interface Contact{
    id:number;
    email:string;
    phoneNumber:string;
    linkedId?:number | null;
    linkPrecedence:'primary' | 'secondary';
    createdAt:Date;
    updatedAt:Date;
    deletedAt?:Date | null;
}

export interface identifyRequest {
    email?: string;
    phoneNumber?: string;

}   

export interface identifyResponse{
    contact:{
        primaryContactId:number;
        emails:string[];
        phoneNumbers:string[];
        secondaryContactIds:number[];
    }
}