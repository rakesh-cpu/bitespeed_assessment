import cors from 'cors';
import express from 'express';
import identifyRoutes from './routes/identify';
import * as dotenv from 'dotenv';
import testConnection from './testdatabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/v1/',identifyRoutes);

app.get("/health",(req,res)=>{
    res.status(200).send({status:"Okay",success:true,timestamp: new Date().toString()});
});
// testConnection();
app.listen(port,()=>{
    console.log(`Server running on PORT: ${port}`);
})

export default app;

