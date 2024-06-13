import Stripe from 'stripe';
// import {CustomError} from '../../core/ApiError';
import {keys} from '../../config/index';

const stripe =new Stripe(keys.STRIPE_SECRET);

class StripeSubscription {
    createSubscription = async (customerId:string,priceId:string)=>{
        const subscription = await stripe.subscriptions.create({
            customer:customerId,
            items:[
                {
                    price:priceId,
                },
            ],
            automatic_tax:{
                enabled:true,
            },
            payment_behavior:'default_incomplete',
            payment_settings:{
                payment_method_types:['card'],
                save_default_payment_method:'on_subscription',
            },
            expand:['latest_invoice.payment_intent'],
        });
        return subscription;
    };

    retrieveSubscription = async (subscriptionId:string) => {
        const subscription =await stripe.subscriptions.retrieve(subscriptionId);
        if(!subscription || !subscription.latest_invoice)
            throw new CustomeError('Subscription not exists');

        const invoice = subscription.latest_invoice as Stripe.Invoice;
        const invoiceData = await stripe.invoices.retrieve(String(invoice),{
            expand:['payment_inntent'],
        });
        return {invoiceData,subscription};
    };

    chargeSubscription = async(subscriptionId:string,customerId:string) =>{
        try{
            //retrieve subscription
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            if(!subscription) throw new CustomError('subScription not exist with given id');

            //check if subscription is incomplete status
            if(subscription.status === 'incomplete'){
                const invoiceId= subscription.latest_invoice as string;
                const invoice = await stripe.invoices.retrieve(invoiceId,{
                    expand:['payment_intent'],
                });

                if(!invoice || !invoice.payment_intent){
                    throw new CustomError('No Invoice exist for customer');

                    //check invoice paid?
if(invoice.status === 'open'){
    if(customerId !== subscription.customer)
        throw new CustomError('customer id not matched with latest invoice customertId');
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if(!('invoice_settings' in customer))
        throw new CustomError('No invoice exist for customer');
    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;
    if(!defaultPaymentMethod)
        throw new CustomError('No default payment method attached to customer');

    const paymentIntentId = invoice.payment_intent as Stripe.PaymentIntent;
    const paymentIntent =await stripe.paymentIntents.confirm(paymentIntentId.id,{
        payment_method:defaultPaymentMethod as string,
            });
            //check payment was sucess
            if(paymentIntent.status === 'suceeded'){
                console.log('Payment confirmed successfully',paymentIntent);
                const updatedSubscription = await stripe.subscriptions.retrieve(subscriptionId);
                return updatedSubscription;
            }else{
                console.error("eroorr to confirm payment",paymentIntent);
            }

}else{
    console.error('Invoice already paid',invoice.status);
}
                }else{
                    console.error('subscription is not complete',subscription.status);
                }
            }
        }catch(err){
            console.error('error in payment',err);
        }
    };

    updateSubscribe = async function (subscriptionId:string, default_payment_method:string){
        try{
const subscription = await stripe.subscriptions.update(subscriptionId,{
    default_payment_method,
});
return subscription;
        }catch(err){
            console.error('error in payment',err);
        }
    };

    cancel = async function(subscriptionId:string){
        try{
const deleted = await stripe.subscriptions.cancel(subscriptionId);
return deleted;
        }catch(err){
            console.error('error in payment',err);
        }
    };

    chargeInvoice = async (invoiceId:string)=>{
        const invoice =await stripe.invoices.pay(invoiceId);
        return invoice;
    }
}