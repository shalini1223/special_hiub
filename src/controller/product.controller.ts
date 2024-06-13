import {Response} from 'express';
import {PRODUCUT_ID} from '../constants';
import {keys} from '../config/index';
import stripe from 'stripe';

const stripe = new stripeCustomer(keys.STRIPE_SECRET);

class ProductController extends ResponseHandler {
getPrice: asyncHandler(async (req:CustomRequest,res:Response) =>{
const customer = await Customer.findOne({userId:req.user?._id},{customerId:1});
if(!customer) throw new CustomError('customer not exists');
const prices = await stripe.prices.list({
    product:PRODUCUT_ID.
    active:true,
});
if(!prices) throw new CustomError('No price exist for product');
const pricesData =prices.data[0];
const priceResponse ={
    priceId:pricesData.id,
    active:pricesData.active,
    currency: pricesData.currency,
    liveMode: pricesData.liveMode,
    metaData:pricesData.metaData,
    product:pricesData.product,
    recurring:pricesData.recurring,
    tax_behavior:pricesData.tax_behavior,
    type:pricesData.type,
    unit_amount:pricesData.unit_amount ? parseFloat((pricesData.unit_amount/100).toFixed(2)) : pricesData.unit_amount,
    CustomerId:customer.customerId,
};
await this.sendResponse(priceResponse,res);
});
}

const productController = new ProductController();
export {productController};