// app/api/expenses/categories/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import db from "@/lib/dbConnect";
import TransactionModel from "@/models/transaction.model";
import mongoose from "mongoose";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    await db();


    // canonical list of categories that are shown as-is; others become "Other"
    const ALLOWED = ["food", "travel", "shopping", "entertainment", "health", "bills", "groceries", "other"];

    // Aggregation pipeline:
    // - match user's expenses
    // - try to convert categoryId (string) into ObjectId for lookup
    // - lookup category doc if ObjectId exists
    // - resolve display name: prefer looked-up name, otherwise free-text category
    // - normalize to ALLOWED set (case-insensitive) -> default "Other"
    // - group by normalized name and sum amounts
    const agg = await TransactionModel
      .aggregate([
        { $match: { user: new mongoose.Types.ObjectId(session.user.id), kind: "expense" } },

        // Convert categoryId (string) -> ObjectId when possible (otherwise null)
        {
          $addFields: {
            categoryObjectId: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$category", null] },
                    { $ne: ["$category", ""] },
                    { $regexMatch: { input: { $toString: "$category" }, regex: /^[a-fA-F0-9]{24}$/ } }
                  ]
                },
                { $toObjectId: { $toString: "$category" } },
                null
              ]
            }
          }
        },

        // Lookup category doc (if any)
        {
          $lookup: {
            from: "categories",
            localField: "categoryObjectId",
            foreignField: "_id",
            as: "catDoc"
          }
        },

        // catNameFromDoc will be the looked-up name (if found)
        {
          $addFields: {
            catNameFromDoc: { $arrayElemAt: ["$catDoc.name", 0] }
          }
        },

        // Choose resolvedName: prefer looked-up doc name, otherwise expense.category field
        {
          $addFields: {
            resolvedName: {
              $ifNull: ["$catNameFromDoc", { $ifNull: ["$category", "Other"] }]
            }
          }
        },

        // Normalize: lowercase and trim
        {
          $addFields: {
            resolvedLower: { $toLower: { $trim: { input: "$resolvedName" } } }
          }
        },

        // If resolvedLower is in allowed list, map back to proper-cased bucket (else "Other")
        {
          $addFields: {
            normalizedCategory: {
              $cond: [
                { $in: ["$resolvedLower", ALLOWED] },
                {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$resolvedLower", "food"] }, then: "Food" },
                      { case: { $eq: ["$resolvedLower", "travel"] }, then: "Travel" },
                      { case: { $eq: ["$resolvedLower", "shopping"] }, then: "Shopping" },
                      { case: { $eq: ["$resolvedLower", "entertainment"] }, then: "Entertainment" },
                      { case: { $eq: ["$resolvedLower", "health"] }, then: "Health" },
                      { case: { $eq: ["$resolvedLower", "bills"] }, then: "Bills" },
                      { case: { $eq: ["$resolvedLower", "other"] }, then: "Other" }
                    ],
                    default: "Other"
                  }
                },
                "Other"
              ]
            }
          }
        },

        // Group by normalized bucket
        {
          $group: {
            _id: "$normalizedCategory",
            total: { $sum: "$amount" }
          }
        },

        // Return highest totals first (optional)
        { $sort: { total: -1 } }
      ])

    const result = agg.map((c: any) => ({
      category: c._id || "Other",
      total: Number(c.total || 0)
    }));
    // console.log("Computed expense categories for user:", session.user.id, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/expenses/categories error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
