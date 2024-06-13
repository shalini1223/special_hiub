import mongoose from 'mongoose';
import { stripeCustomer } from '../plugin/stripe/customer.stripe';
import {Customer} from '../models/stripe/customer.models';

interface IUserData {
userId: mongoose.Schema.Types.ObjectId;
email:string;
}
class UserService {
    createStripeCustomer = async (data:IUserData)=>{
        const customer = await stripeCustomer.createCustomer(data.email);
        return await Customer.create({
            ...data,
            customerId:customer.id,
        });
    };
}

const userService=new UserService();
export {userService};