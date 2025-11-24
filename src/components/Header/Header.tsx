"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import AddTransactionModal from "./AddTransactionModal";

export default function HeaderBar() {
  const searchParams = useSearchParams();
  const view = (searchParams?.get("view") || "").toString();

  // hide whole header for these
  const hideHeader = ["analytics", "categories", "profile"].includes(view);

  const [openExpense, setOpenExpense] = useState(false);
  const [openIncome, setOpenIncome] = useState(false);

  function onSaved() {
    window.dispatchEvent(new CustomEvent("monify:expense:added"));
  }

  if (hideHeader) {
    // return an empty spacer to maintain layout spacing
    return <div className="h-2" />;
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back! Here's your financial overview.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpenExpense(true)}
          className="px-3 py-1 rounded bg-blue-600 text-white"
          aria-label="Add expense"
        >
          + Add Expense
        </button>

        <button
          onClick={() => setOpenIncome(true)}
          className="px-3 py-1 rounded bg-green-600 text-white"
          aria-label="Add income"
        >
          + Add Income
        </button>

        {/* Modals */}
        <AddTransactionModal
          kind="expense"
          open={openExpense}
          onClose={() => setOpenExpense(false)}
          onSaved={onSaved}
        />
        <AddTransactionModal
          kind="income"
          open={openIncome}
          onClose={() => setOpenIncome(false)}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
