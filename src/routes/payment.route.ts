import express from 'express';
import { paymentController } from '../controller/payment.controller';
import {auth} from '../middlewares/auth/user.auth';

const paymentRoutes =express.Router();

paymentRoutes.post('/create-subscription', auth.userAuth,paymentController.createSubscription);
paymentRoutes.post('/buy-subscription', auth.userAuth,paymentController.payInvoice);
paymentRoutes.get('/get-subscription/:subscriptionId',paymentController.getSubscription);

export {paymentRoutes};