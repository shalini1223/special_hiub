import {Request, Response} from 'express';
import {User} from '..model/user.model';
import { stripeCustomer,IData } from '../plugin/stripe/customer.stripe';
import { Customer } from '../models/stripe/customer.models';
import { userService } from '../services/user.service';

interface IResponsePayload{
    userId:ObjectId;
    token:string;
    usetType:number;
    activeNotification:boolean;
    screen:number;
    customerId:string; 
}

class UserController extends ResponseHandler{
    registerUser = asyncHandler(async(req:Request,res:Response)=>{
        const{email,password,userType,deviceId} =req.body;
        const userExists= await User.findOne({email,userType});
        if(userExists){
            throw new ClientError('user already exists');
        }
        const updateBody = {
            password,status:'pending',
            userType,email,deviceId,...(screen && {screen}),
        };
        const user = await User.create(updateBody);
        const token = jwtHandler.createJwtToken({userId:user._id});

        await User.findOneUpdate({_id:user._id},{$set:{token}});
        const responsePayload:IResponsePayload={
            userId:user._id,
            token,
            userType,
            activeNotification:user?.activeNotification,
            screen:user.screen
        };
        const data ={
            userId:user._id,email
        }
        const isCreated = await userService.createStripeCustomer(data);
        responsePayload.customerId=isCreated.customerId;
        (!isCreated) throw new CustomeError('customer not added in customer');
        await this.sendResponse(responsePayload,res);
    })
}

const userController=new UserController();
export {userController};