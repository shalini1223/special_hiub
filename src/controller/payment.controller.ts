import { Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { ClientError, CustomError } from '../core/ApiError';
import { stripeSubscription } from '../plugin/stripe/subscription.stripe';
import { CustomRequest } from './users.controller';
import Stripe from 'stripe';
import { Membership } from '../models/stripe/membership.model';
import { PAYMENT_DESC } from '../constants';
import { Order } from '../models/stripe/order.model';
import { stripeCustomer } from '../plugin/stripe/customer.stripe';
import { Customer } from '../models/stripe/customer.model';
import { Card } from '../models/stripe/card.model';
import moment from 'moment';
 
class PaymentController extends ResponseHandler {
  createSubscription = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { customerId, priceId } = req.body;
    if (!customerId || !priceId) throw new ClientError('customerId and priceId required');
    const isMembershipExist = await Membership.findOne({ customerId: customerId }, { isActive: 1 });
 
    // check if membership already exist and active
    if (isMembershipExist && isMembershipExist.isActive) 
      throw new CustomError('Membership already exist for the customer');
 
    const subscription = await stripeSubscription.createSubscription(customerId, priceId);
    const latest_invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentMethod = latest_invoice.payment_intent as Stripe.PaymentIntent;
 
    const memberShip = await Membership.create({
      userId: req.user?._id,
      customerId,
      subscriptionId: latest_invoice.subscription,
      totalAmount: (latest_invoice.total / 100).toFixed(2),
      taxAmount: latest_invoice.tax ? (latest_invoice.tax / 100).toFixed(2) : latest_invoice.tax,
      description: PAYMENT_DESC,
      priceId: subscription.items.data[0].plan.id,
    });
 
    const createdOrder = await Order.create({
      userId: req.user?._id,
      customerId,
      membershipId: memberShip._id,
      totalAmount: (latest_invoice.total / 100).toFixed(2),
      taxAmount: latest_invoice.tax ? (latest_invoice.tax / 100).toFixed(2) : latest_invoice.tax,
      currency: latest_invoice.currency,
      subscriptionId: latest_invoice.subscription,
      paymentMethodId: paymentMethod.payment_method ?? '',
      invoiceId: latest_invoice.id,
      hostedInvoiceUrl: latest_invoice.hosted_invoice_url,
      invoicePdf: latest_invoice.invoice_pdf,
      subscriptionStart: moment.unix(subscription.current_period_start),
      subscriptionEnd: moment.unix(subscription.current_period_end),
      planInterval: subscription.items.data[0].plan.interval.toUpperCase(),
      subscriptionStatus: subscription.status,
      orderStatus: latest_invoice.status,
    });
 
    if (!memberShip || !createdOrder)
      throw new CustomError('Error while creating membership or order data');
 
    const updatedMembership = await Membership.findById(memberShip._id, {}, { lean: true });
    const memberShipPayload = {
      ...updatedMembership,
      invoiceId: latest_invoice.id,
    };
 
    await this.sendResponse(memberShipPayload, res);
  });
 
  getSubscription = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { subscriptionId } = req.params;
    if (!subscriptionId) throw new ClientError('subscriptionId required');
    const subscription = await stripeSubscription.retrieveSubscription(subscriptionId);
    const newPlan = subscription.subscription;
    const subscriptionStatus = newPlan.status;
    const subscriptionStart = moment.unix(newPlan.current_period_start);
    const subscriptionEnd = moment.unix(newPlan.current_period_end);
    console.log(subscriptionStart, 'subscriptionStart', subscriptionEnd, 'subscriptionEnd');
    if (!subscription)
      throw new CustomError('Subscription not exist');
    const memberShip = await Membership.findOneAndUpdate({ subscriptionId },
      {
        subscriptionStatus: subscriptionStatus,
        subscriptionStart: subscriptionStart,
        subscriptionEnd: subscriptionEnd,
      },
      { new: true }
    );
    if (!memberShip) throw new CustomError('Error updating customer membership');
 
    const cardData = await Card.findOne(
      { userId: memberShip.userId },
      { last4: 1, brand: 1 },
      { lean: true }
    );
 
    const responsePayload = {
      plan: (Number(memberShip.totalAmount) - Number(memberShip.taxAmount)).toFixed(2),
      PurchaseDate: memberShip.subscriptionStart,
      Renewsubscriptionby: memberShip.subscriptionEnd,
      taxAmount: Number(memberShip.taxAmount).toFixed(2),
      paymentMethod: cardData?.last4,
      brand: cardData?.brand,
    };
    await this.sendResponse(responsePayload, res);
  });
 
  // For 1st payment need to make paymentId as default
  payInvoice = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { invoiceId, brand, expMonth, expYear, funding, last4, name, paymentId } = req.body;
    if (!invoiceId) throw new ClientError('InvoiceId required');
 
    const customer = await Customer.findOne({ userId: req.user?._id }, { customerId: 1 });
    if (!customer) throw new CustomError('Customer not exist');
    // Add paymentId to customer profile
    await stripeCustomer.attachPaymentMethod(customer.customerId, paymentId);
    await stripeCustomer.updateCustomerPaymentMethod(customer.customerId, paymentId);
 
    const cardDetails = await Card.find({ userId: req.user?._id });
    // Adding card details in Card model
    const createdCard = await Card.create({
      userId: req.user?._id,
      name,
      brand,
      last4,
      expMonth,
      expYear,
      funding,
      isPrimary: cardDetails.length > 0 ? false : true,
      paymentMethodId: paymentId,
    });
 
    // update customer model with default paymentMethod
    await customer.updateOne({
      $set: {
        defaultPaymentId: paymentId,
      },
      $push: {
        cards: createdCard._id,
      },
    });
    // making payment from default payment method
    const data = await stripeSubscription.chargeInvoice(invoiceId);
    if (data.status !== 'paid') throw new CustomError('Invoice not paid');
    const updatedMembership = await Membership.findOneAndUpdate(
      { subscriptionId: data.subscription },
      {
        $set: {
          isActive: true,
          subscriptionStart: moment.unix(data.lines.data[0].period.start).toDate(),
          subscriptionEnd: moment.unix(data.lines.data[0].period.end).toDate(),
        },
      },
      { new: true, lean: true }
    );
    if (!updatedMembership) throw new CustomError('Error updating customer membership');
 
    const { totalAmount, taxAmount, ...rest } = updatedMembership;
    const responsePayload = {
      ...rest,
      plan: (Number(totalAmount) - Number(taxAmount)).toFixed(2),
      taxAmount: Number(taxAmount).toFixed(2),
      paymentMethod: last4,
    };
    await Order.findOneAndUpdate(
      { subscriptionId: data.subscription },
      {
        $set: {
          isPaid: true,
          orderStatus: data.status,
          subscriptionStatus: 'active',
          subscriptionStart: moment.unix(data.lines.data[0].period.start),
          subscriptionEnd: moment.unix(data.lines.data[0].period.end),
        },
      },
      { new: true }
    );
    await this.sendResponse(responsePayload, res);
  });
}
 
const paymentController = new PaymentController();
export { paymentController };