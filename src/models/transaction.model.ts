import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface Transaction extends Document {
    title?: string;
    amount: mongoose.Types.Decimal128;
    currency: string;
    kind: 'income' | 'expense' | 'transfer';
    date: Date;
    notes?: string;
    category?: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    paymentMethod?: 'cash' | 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet' | 'other';
    receiptUrl?: string;
}

const TransactionSchema: Schema = new Schema(
    {
        title: { type: String },
        amount: { type: Schema.Types.Decimal128, required: true },
        currency: { type: String, default: 'INR' },

        kind: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
        date: { type: Date, default: Date.now },
        notes: { type: String },
        category: { type: mongoose.Types.ObjectId, ref: 'Category', default: null },
        user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
        paymentMethod: { type: String, enum: ['cash', 'credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'other'] },
        receiptUrl: { type: String },
    },
    { timestamps: true }
);

const TransactionModel = models.Transaction || model<Transaction>('Transaction', TransactionSchema);
export default TransactionModel;