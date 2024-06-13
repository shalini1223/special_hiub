import express from 'express';
import { userController } from '../controller/users.controllers';
import {userValidation, validateRequest} from '../middlewares/validation/user.validation';

const userRoutes = express.Router();

userRoutes.post('/signup',userValidation.registerUser(),validateRequest,userController.registerUser);