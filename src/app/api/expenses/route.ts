// app/api/expenses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
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
        const title = String(body.title || "").trim();
        const amount = Number(body.amount);
        const kind = body.kind === "income" ? "income" : "expense";

        // For incomes we force category to empty string
        const category =
            kind === "income"
                ? ""
                : String(body.category ?? body.cat ?? "uncategorized").trim();

        const date = body.date
            ? new Date(body.date).toISOString()
            : new Date().toISOString();

        const notes = String(body.notes || "").trim();

        if (!title || !Number.isFinite(amount)) {
            return NextResponse.json(
                { error: "Invalid payload: missing title or amount" },
                { status: 400 }
            );
        }


        // Accept categoryId from client; if provided convert to ObjectId, otherwise null
        let categoryId: any = null;
        if (body.categoryId) {
            try {
                // if it's an ObjectId-like string convert; if it's already an ObjectId, preserve
                if (typeof body.categoryId === "string") {
                    // only convert if it's a 24-hex string
                    const s = String(body.categoryId);
                    if (/^[a-fA-F0-9]{24}$/.test(s)) categoryId = new ObjectId(s);
                    else categoryId = null;
                } else {
                    // attempt conversion for other types
                    categoryId = new ObjectId(String(body.categoryId));
                }
            } catch {
                // invalid id -> ignore and keep null
                categoryId = null;
            }
        }

        const doc: any = {
            user: session.user.id,
            title,
            amount,
            category: categoryId,
            date,
            notes,
            kind,
            createdAt: new Date().toISOString(),
        };

        const res = await TransactionModel.insertOne(doc);

        // respond with categoryId as string|null so client can consume easily
        console.log("Inserted transaction with id:", res);
        return NextResponse.json(
            {
                _id: res._id,
                ...doc,
                categoryId: categoryId ? String(categoryId) : null,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("POST /api/expenses error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/* -------------------------------------------------------------------------- */
/*                                READ ENTRIES (EXPENSES ONLY)               */
/* -------------------------------------------------------------------------- */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }
        await db();

        const url = new URL(req.url);
        const limit = Number(url.searchParams.get("limit") || 100);

        // Return only expenses (exclude incomes from All Entries)
        const items = await TransactionModel
            .find({ user: new mongoose.Types.ObjectId(session.user.id), kind: "expense" })
            .sort({ date: -1 })
            .limit(limit)
            .populate({
                path: 'category',
                select: 'name -_id' // Select 'name' and EXCLUDE '_id'
            })
            .lean();

        // console.log("Fetched expenses:", items);
        return NextResponse.json(
            items.map((i: ExpenseDoc) => ({
                title: i.title,
                amount: Number(i.amount),
                kind: i.kind,
                _id: i._id.toString(),
                category: i.category ? (i.category as any).name : "uncategorized",
                date: i.date.toString(),
                notes: i.notes || "",
            }))
        );
    } catch (err) {
        console.error("GET /api/expenses error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/* -------------------------------------------------------------------------- */
/*                                DELETE ENTRY                                */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }
        await db();

        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }


        const result = await TransactionModel
            .deleteOne({ _id: new ObjectId(id), user: session.user.id });
        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Expense not found or unauthorized" },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("DELETE /api/expenses error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
