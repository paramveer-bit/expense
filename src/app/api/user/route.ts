// app/api/user/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/dbConnect";
import { getServerSession } from "next-auth/next";
import UserModel from "@/models/user.model";
import { authOptions } from "../auth/[...nextauth]/route";

// type UserDoc = {
//     email: string;
//     name?: string | null;
//     monthlyIncome?: number | null;
//     theme?: "light" | "dark" | null;
//     createdAt?: Date;
//     updatedAt?: Date;
// };

// function parseMonthlyIncome(val: unknown): number | null | undefined {
//     if (val === null) return null;
//     if (val === undefined) return undefined;
//     if (typeof val === "number") {
//         if (Number.isFinite(val)) return val;
//         return null;
//     }
//     if (typeof val === "string") {
//         const s = val.trim();
//         if (s === "") return null;
//         const n = Number(s);
//         return Number.isFinite(n) ? n : null;
//     }
//     return null;
// }

/**
 * Lightweight typed interface for the users collection methods we use.
 * This avoids importing or depending on the MongoDB Collection type which
 * can cause mismatches across driver versions / setups.
 */
// type TypedUsersCol = {
//     findOne(query: any): Promise<UserDoc | null>;
//     findOneAndUpdate(filter: any, update: any, options: any): Promise<{ value: UserDoc | null }>;
// };

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    await db();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const email = String(session.user.email);

    await db();

    const user = await UserModel.findOne({ email });

    // 204 No Content when user not found
    if (!user) return NextResponse.json({}, { status: 204 });
    return NextResponse.json(user);
}

// export async function PUT(req: Request) {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//         return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
//     }
//     const email = String(session.user.email);

//     let body: any = {};
//     try {
//         body = (await req.json()) || {};
//     } catch (err) {
//         return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
//     }

//     // sanitize allowed fields
//     const patch: Partial<UserDoc> = {};
//     if (typeof body.name === "string") {
//         const nm = body.name.trim();
//         patch.name = nm.length > 0 ? nm : null;
//     }

//     const parsedIncome = parseMonthlyIncome(body.monthlyIncome);
//     if (parsedIncome !== undefined) {
//         // allow explicit null to clear income
//         patch.monthlyIncome = parsedIncome;
//     }

//     if (body.theme === "light" || body.theme === "dark") {
//         patch.theme = body.theme;
//     }

//     // nothing to update?
//     if (Object.keys(patch).length === 0) {
//         return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
//     }

//     const client = await clientPromise;
//     const db = client.db();
//     const col = db.collection("users") as unknown as TypedUsersCol;

//     const now = new Date();
//     const update = {
//         $set: { ...patch, email, updatedAt: now },
//         $setOnInsert: { createdAt: now },
//     };

//     try {
//         const res = await col.findOneAndUpdate({ email }, update, { upsert: true, returnDocument: "after" });
//         const updated = res.value;
//         if (!updated) {
//             return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
//         }
//         return NextResponse.json(updated);
//     } catch (err) {
//         console.error("PUT /api/user error:", err);
//         return NextResponse.json({ error: "Server error" }, { status: 500 });
//     }
// }
