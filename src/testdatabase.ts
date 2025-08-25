import pool from './config/database';

async function testConnection(){
    try{
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Database connection successful:');
        console.log("Current time for DB:",result.rows[0]);
        client.release();

        const tableCheck = await pool.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='contacts'`
        );
        if(tableCheck.rowCount === 0){
            console.log("Table contacts does not exist. Creating...");
            await pool.query(
                `CREATE TABLE IF NOT EXISTS contacts(
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(20),
                    email VARCHAR(250),
                    linked_id INTEGER REFERENCES contacts(id),
                    link_precedence VARCHAR(15) CHECK (link_precedence IN ('primary','secondary')),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TIMESTAMP WITH TIME ZONE
                );`
            );
            console.log("Table contacts created successfully.");
        }else{
            console.log("Table contacts already exists.");
        }
    }catch(err){
        console.error('Database connection test failed:',err);
    }finally{
        await pool.end();
    }
}

// testConnection();
export default testConnection;