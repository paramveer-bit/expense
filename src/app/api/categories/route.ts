// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import db from "@/lib/dbConnect";
import { ObjectId } from "mongodb";
import CategoryModel from "@/models/category.model";
import TransactionModel from "@/models/transaction.model";

function toNumberOrNull(v: any): number | null {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
    try {
        await db();
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        console.log("Fetching categories for user:", session.user.id);
        const cats = await CategoryModel.find({ user: session.user.id });
        // return array (empty allowed). Normalize _id and budget.
        console.log("Fetched categories for user:", session.user.id, cats);
        const normalized = cats.map((c: any) => ({
            color: c.color,
            name: c.name,
            type: c.type,
            createdAt: c.createdAt,
            user: c.user,
            _id: c._id.toString(),
            budget: c.budget != null ? Number(c.budget) : null,
        }));
        return NextResponse.json(normalized);
    } catch (err) {
        console.error("GET /api/categories error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        await db();
        const body = await req.json();
        console.log("POST /api/categories body:-------------", body);
        const name = String(body.name || "").trim();
        const color = body.color ? String(body.color).trim() : "#6b7280";
        const type = body.type ? String(body.type).trim() : undefined;
        const budget = toNumberOrNull(body.budget);
        if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });



        const existing = await CategoryModel.findOne({ user: session.user.id, name });
        if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });

        const doc: any = {
            user: session.user.id,
            name,
            color,
            createdAt: new Date().toISOString(),
        };
        if (type) doc.type = type;
        if (budget !== null) doc.budget = budget;
        console.log("Inserting category doc:", doc);
        const res = await CategoryModel.insertOne(doc);
        console.log("Inserted category with id:", res);
        return NextResponse.json({ _id: res._id, ...doc }, { status: 201 });
    } catch (err) {
        console.error("POST /api/categories error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await db();
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

        const body = await req.json();
        // support id either in body._id or query param id
        const id = body._id || new URL(req.url).searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const updates: any = {};
        if (body.name) updates.name = String(body.name).trim();
        if (body.color) updates.color = String(body.color).trim();
        if (body.type !== undefined) updates.type = body.type ? String(body.type).trim() : undefined;
        // budget can be null
        if ("budget" in body) updates.budget = toNumberOrNull(body.budget);

        console.log("Updating category id:", id, "with:", updates);

        const result = await CategoryModel.findOneAndUpdate(
            { _id: new ObjectId(id), user: session.user.id },
            { $set: updates },
            { returnDocument: "after" }
        );


        if (!result.value) return NextResponse.json({ error: "Category not found" }, { status: 404 });
        const updated = result.value;
        return NextResponse.json({ ...updated, _id: updated._id.toString(), budget: updated.budget != null ? Number(updated.budget) : null });
    } catch (err) {
        console.error("PUT /api/categories error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await db();
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        const force = url.searchParams.get("force") === "true";

        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });



        const category = await CategoryModel.findOne({ _id: new ObjectId(id), user: session.user.id });
        if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // check usage by expenses - match by category name OR categoryId (if expenses store id)
        const used = await TransactionModel.findOne({
            user: session.user.id,
            $or: [
                { category: id },
            ],
        });

        if (used && !force) {
            return NextResponse.json({ error: "Category in use by existing expenses" }, { status: 409 });
        }

        if (used && force) {
            // reassign any expenses referencing this category to 'Other' (category string) and clear categoryId
            await TransactionModel.updateMany(
                {
                    user: session.user.id,
                    $or: [
                        { category: category.name },
                        { category: id },
                        { categoryId: id },
                        { category_id: id },
                        { categoryId: { $exists: false }, category: category.name }, // defensive
                    ],
                },
                { $set: { category: "Other", categoryId: null } }
            );
        }

        const res = await CategoryModel.deleteOne({ _id: new ObjectId(id), user: session.user.id });
        if (res.deletedCount === 0) return NextResponse.json({ error: "Delete failed" }, { status: 400 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("DELETE /api/categories error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
