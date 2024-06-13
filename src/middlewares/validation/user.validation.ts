import {body,param,validationResult} from 'express-validator';
import {NextFunction,Request,Response} from 'express';

class UserValidation {
private passwordValidation=(field:string)=>{
    return body(field)
    .exists()
    .isString()
    .notEmpty()
}
}

const userValidation = new UserValidation();
export {userValidation}