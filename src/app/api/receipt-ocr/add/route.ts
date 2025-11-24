// app/api/expenses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import db from "@/lib/dbConnect";
import TransactionModel from "@/models/transaction.model";
import mongoose from "mongoose";

type ExpenseDoc = {
    _id: any;
    userId: string;
    title: string;
    amount: number;
    category: string;
    categoryId?: any | null;
    date: string;
    notes?: string;
    kind: "expense" | "income";
    createdAt: string;
};

/* -------------------------------------------------------------------------- */
/*                               CREATE EXPENSE/INCOME                        */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }
        await db();

        const body = await req.json();
        const data = body.expenses

        if (data.length === 0) {
            return NextResponse.json({ error: "No expenses provided" }, { status: 400 });
        }
        console.log("Received expenses:", data);

        const userId = session.user.id;
        const expensesToInsert = data.map((expense: any) => ({
            user: new ObjectId(userId),
            title: expense.title,
            amount: expense.amount,
            kind: expense.kind,
            date: expense.date,
            notes: expense.notes || "",
            category: expense.category ? new ObjectId(expense.category) : null,
            currency: "INR",
            createdAt: new Date().toISOString(),
            paymentMethod: expense.paymentMethod || "other",
        }));

        // console.log("Inserting expenses:", expensesToInsert);

        await TransactionModel.insertMany(expensesToInsert);
        return NextResponse.json({ message: "Expenses received" }, { status: 200 });
    } catch (err) {
        console.error("POST /api/expenses error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}