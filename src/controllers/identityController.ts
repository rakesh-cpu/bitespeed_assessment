import {Request,Response} from 'express';
import { IdentityService } from '../services/identityService';
import { identifyRequest } from '../models/Contact';


const identityService = new IdentityService();

export const identify = async (req: Request, res: Response): Promise<void> =>{
    try{
        const request:identifyRequest = req.body;
        console.log('request:',request);
        if(!request.email && !request.phoneNumber){
            res.status(400).json({
                error: 'Either email or phoneNumber must be provided'
            });
            return;
        }
        const result = await identityService.identify(request);
        res.status(200).json(result);
    }catch(error){
        console.error('Error in identify controller:',error);
        res.status(500).json({
            error:error.message,
            success:false
        })
    }
}