import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import db from "@/lib/dbConnect";
import TransactionModel from "@/models/transaction.model";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    await db()

    const userId = session.user.id;
    const url = new URL(req.url);
    const view = (url.searchParams.get("view") || "summary").toLowerCase(); // summary | daily | weekly | monthly | yearly

    // Summary totals (for stat cards)
    if (view === "summary") {
      const agg = await TransactionModel
        .aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: "$kind", total: { $sum: "$amount" } } },
        ])
      // console.log(agg, userId);

      let totalIncome = 0;
      let totalExpenses = 0;

      agg.forEach((g: any) => {
        if (g._id === "income") totalIncome = g.total;
        else if (g._id === "expense") totalExpenses = g.total;
      });

      const balance = totalIncome - totalExpenses;

      // console.log("Summary totals:", { totalIncome, totalExpenses, balance });
      return NextResponse.json({
        income: Number(totalIncome) ?? 0,
        expenses: Number(totalExpenses) ?? 0,
        balance: balance ?? 0,
      });
    }

    // Chart grouping formats
    let groupFormat = "%Y-%m-%d"; // daily
    if (view === "weekly") groupFormat = "%Y-%U";
    else if (view === "monthly") groupFormat = "%Y-%m";
    else if (view === "yearly") groupFormat = "%Y";
    // console.log("Using group format:", groupFormat);
    const agg = await TransactionModel
      .aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
          $addFields: {
            groupKey: {
              $dateToString: {
                format: groupFormat,
                date: { $toDate: "$date" },
              },
            },
          },
        },
        {
          $group: {
            _id: { key: "$groupKey", kind: "$kind" },
            total: { $sum: "$amount" },
          },
        },
        {
          $group: {
            _id: "$_id.key",
            values: { $push: { kind: "$_id.kind", total: "$total" } },
          },
        },
        { $sort: { _id: 1 } },
      ])


    const result = agg.map((d: any) => ({
      date: d._id, // e.g. "2025-11-01" or "2025-45" (weekly) or "2025-11" (monthly) or "2025"
      income: Number(d.values.find((v: any) => v.kind === "income")?.total ?? 0),
      expense: Number(d.values.find((v: any) => v.kind === "expense")?.total ?? 0),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/expenses/summary error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
