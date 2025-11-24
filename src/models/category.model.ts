import mongoose, { Schema, Document, model, models } from 'mongoose';


export interface Category extends Document {
    name: string;
    description?: string;
    type?: string;
    colorCode?: string;
    user: mongoose.Types.ObjectId;
    budget?: number;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        type: { type: String },

        color: { type: String }, // UI color for chip/card
        user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
        budget: { type: Number }
    },
    { timestamps: true }
);

const CategoryModel = models.Category || model<Category>('Category', CategorySchema);
export default CategoryModel;