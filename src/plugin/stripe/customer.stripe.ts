import {keys} from '../../config/index';
import Stripe from 'stripe';

const stripe = new Stripe(keys.STRIPE_SECRET);

type IAddress = {
    line1:string;
    city:string;
    state:string;
    country:string;
    postal_code: string;
};

export interface IData {
    address?:IAddress;
    shipping?:{
        address:IAddress;
        name:string;
        phone?:string;
    };
    invoice_settings?:{
        default_payment_method:string;
    };
    description?:string;
    phone?:string;
}

class StripeCustomer {
    createCustomer = async (email:string) =>{
        const customer = await stripe.customers.create({
            email:email,
            description:'membership customer',
            metadata:{
                email,
            },
            expand:['tax'],
        });
        return customer;
    };

    updateCustomer = async(id:string,data:IData)=>{
        const updatedCustomer= await stripe.customers.update(id,{
            ...(data.address && {addres:data.address}),
            ...(data.invoice_settings && {invoice_settings:data.invoice_settings}),
            ...(data.description && {description:data.description}),
            ...(data.phone && {phone: data.phone}),
            ...(data.shipping && {shipping: data.shipping}),
        });
        return updatedCustomer;
    };

    attachPaymentMethod = async (customerId:string,payId:string) =>{
        return await stripe.paymentMethods.attach(payId,{
            customer:customerId,
        });
    };

updateCustomerPaymentMethod = async (customerId:string,payId:string)=>{
    return await stripe.customers.update(customerId,{
        invoice_settings:{
            default_payment_method:payId,
        }
    })
};

    deattachPaymentMethod = async(paymentId:string) =>{
        return await stripe.paymentMethods.detach(paymentId);
    };
}

const stripeCustomer = new StripeCustomer();
export {stripeCustomer};