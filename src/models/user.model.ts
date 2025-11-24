import mongoose, { Schema, Document, model, models } from 'mongoose';


export interface User extends Document {
    username: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    verified: boolean;
    balance: mongoose.Types.Decimal128;
    otp?: string;
}


const UserSchema: Schema = new Schema<User>(
    {
        username: { type: String, required: false, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        verified: { type: Boolean, default: false },
        balance: { type: Schema.Types.Decimal128, default: 0.0 },
        otp: { type: String },
    },
    { timestamps: true }
);


const UserModel = models.User || model<User>('User', UserSchema);
export default UserModel;
