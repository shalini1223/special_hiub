import mongoose,{Document, Schema} from 'mongoose';

export interface ICustomer extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    customerId:string;
    email:string;
    defaultPaymentId:string;
    cards:mongoose.Schema.Types.ObjectId[];
}

const customerSchema :Schema<ICustomer>= new Schema(
    {
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'users',
            index:true,
        },
        customerId:{
            type:String,
        },
        email:{
            type:String,
            unique:true,
            lowercase:true,
            index:true,
        },
        defaultPaymentId:{
            type:String,
            default:'',
        },
        cards:{
            type:[mongoose.Schema.Types.ObjectId],
            ref:'cards',
        },
    },
    {
        versionKey:false,
        timestamps:true,
    }
);
const Customer = mongoose.model<ICustomer>('Customer',customerSchema);
export {Customer};