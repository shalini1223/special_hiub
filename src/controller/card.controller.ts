import {Response} from 'express';
import {Card} from '../models/stripe/card.model';
import {Order} from '../models/stripe/order.model';
import  {stripeCustomer} from '../plugin/stripe/customer.stripe';
import {stripeSubscription} from '../plugin/stripe/subscription.stripe';

class CardController extends ResponseHandler {
    addCard = asyncHandler(async(req:CustomRequest,res:Response)=>{
        const {brand,expMonth,expYear,funding,last4,name,paymentId} = req.body;
        if(!brand || !expMonth ) throw new ClientError('Details require');
        const createCard =await Card.create({
            userId:req.user?._id,
            name,
            brand,
            last4,
            expMonth,
            expYear,
            funding,
            paymentMethodId:paymentId
        });
        if(!createCard) throw new CustomError('something went wrong');
        await stripeCustomer.attachPaymentMethod(customer.customerId,paymentId);

        await Customer.updateOne({
            $push{
                cards:createCard._id,
            }
        });
        await this.sendResponse('card added succesfully', res);
    });

    cancelMembership = asyncHnadler(async (req:CustomeRequest,res:Response) =>{
        const data = req.body;
        const orderData = await Order.findOne({
            subscriptionId:data.subscriptionId,
            userId:req.user?._id,
        });
        if(!orderData) throw new CustomError('Order not exists');
        await stripeSubscription.cancel(data.subscriptionId);
        await Membership.updateOne({
            subscriptionId:data.subscriptionId,
            userId:req.user?._id,
        },{$set:{isActive:false}}
        });

        await Order.updateOne({
            subscriptionId:data.subscriptionId,
            userId:req.user?._id,
        },{$set:{subscriptionStatus:'inactive'}}
        );
    })
}