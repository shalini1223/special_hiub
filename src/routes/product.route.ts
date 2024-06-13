import express from 'express';
import {productController} from '../controller/product.controller';

const productRouter = express.Router();

productRouter.get('/get-price',productController.getPrice);

export {productRouter};