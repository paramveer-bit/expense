import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import db from "@/lib/dbConnect";
import TransactionModel from "@/models/transaction.model";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    await db();
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || 5);

    const items = await TransactionModel
      .find({ user: session.user.id, kind: "expense" })
      .sort({ amount: -1 })
      .limit(limit)
      .populate("category");
    console.log("Fetched top expenses:", items);
    const data = items.map((i: any) =>
    ({
      amount: Number(i.amount),
      name: i.title,
      date: i.date.toString(),
      category: i.category ? (i.category as any).name : "uncategorized",
      _id: i._id.toString()
    }))

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/expenses/top error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
