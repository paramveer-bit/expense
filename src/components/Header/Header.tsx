"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import AddTransactionModal from "./AddTransactionModal";
import { Button } from "../ui/button";
import { Upload } from "lucide-react";
import BillUploadModal from "./BillUploadModel";
export default function HeaderBar() {
  const searchParams = useSearchParams();
  const view = (searchParams?.get("view") || "").toString();

  // hide whole header for these
  const hideHeader = ["analytics", "categories", "profile"].includes(view);

  const [openExpense, setOpenExpense] = useState(false);
  const [openIncome, setOpenIncome] = useState(false);
  const [openBillUpload, setOpenBillUpload] = useState(false);

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
        <Button
          onClick={() => setOpenBillUpload(true)}
          variant="outline"
          className="gap-2 bg-transparent"
        >
          <Upload size={18} />
          Upload Bill
        </Button>
        <Button
          className="bg-blue-500 hover:bg-blue-600 gap-2"
          onClick={() => setOpenExpense(true)}
          aria-label="Add expense"
        >
          + Add Expense
        </Button>

        <Button
          className="bg-green-500 hover:bg-green-600 gap-2"
          onClick={() => setOpenIncome(true)}
          aria-label="Add income"
        >
          + Add Income
        </Button>

        {/* Modals */}
        <BillUploadModal
          open={openBillUpload}
          onOpenChange={setOpenBillUpload}
          handelUpload={onSaved}
        />
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
