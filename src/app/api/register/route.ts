// app/api/register/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/dbConnect"
import { hashPassword } from "@/lib/auth";
import UserModel from "@/models/user.model";
import CategoryModel from "@/models/category.model";

export async function POST(request: Request) {
    await db();
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }



    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = {
        username: name,
        email: email.toLowerCase(),
        password: passwordHash,
        createdAt: new Date(),
    };

    const result = await UserModel.insertOne(newUser);
    // Create default categories for the new user
    const defaultCats = defaultCategories.map(cat => ({
        ...cat,
        user: result._id,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));
    const res = await CategoryModel.insertMany(defaultCats);
    // avoid returning password hash
    return NextResponse.json({ ok: true, userId: result._id });
}

export async function GET() {
    return NextResponse.json({ message: "Register endpoint" });
}

const defaultCategories = [
    { name: "Food", type: "Expense", color: "#f87171", budget: null },
    { name: "Travel", type: "Expense", color: "#34d399", budget: null },
    { name: "Shopping", type: "Expense", color: "#60a5fa", budget: null },
    { name: "Entertainment", type: "Income", color: "#fbbf24", budget: null },
    { name: "Health", type: "Income", color: "#a78bfa", budget: null },
    { name: "Bills", type: "Expense", color: "#f472b6", budget: null },
    { name: "Groceries", type: "Expense", color: "#10b981", budget: null },
    { name: "Other", type: "Other", color: "#cbd5e1", budget: null },
];