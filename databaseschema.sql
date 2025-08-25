--Create the Contacts table

CREATE TABLE IF NOT EXISTS contacts(
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20),
    email VARCHAR(250),
    linked_id INTEGER REFERENCES contacts(id),
    link_precedence VARCHAR(15) CHECK (link_precedence IN ('primary','secondary')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);


--indexex 

CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_linked_id ON contacts(linked_id);
CREATE INDEX idx_contacts_precedence ON contacts(link_precedence);


