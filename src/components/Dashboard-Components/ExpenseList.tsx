"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";

type Expense = {
  _id: string;
  title: string;
  amount: number;
  category?: string;
  date: string;
  notes?: string;
  kind?: "expense" | "income";
};

export default function ExpenseList() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get("/api/expenses?limit=500");
      console.log("Load expenses response:", res);
      if (res.status === 200) {
        const data = res.data || [];
        setItems(data);
      } else {
        console.error("Failed to load expenses");
        setItems([]);
      }
    } catch (err) {
      console.error("load error", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    setDeleting(true);
    try {
      const res = await axios.delete(
        `/api/expenses?id=${encodeURIComponent(id)}`
      );
      if (res.status !== 200) {
        alert(res.data?.error || "Delete failed");
        setDeleting(false);
        setConfirmDelete(null);
        return;
      }

      // reload the table
      await load();

      // notify other UI parts (TopCategories, summary, etc.)
      window.dispatchEvent(new CustomEvent("monify:expense:added"));

      setDeleting(false);
      setConfirmDelete(null);
    } catch (err) {
      console.error("delete error", err);
      alert("Delete failed");
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  useEffect(() => {
    load();
    function onAdded() {
      load();
    }
    window.addEventListener("monify:expense:added", onAdded as EventListener);
    return () =>
      window.removeEventListener(
        "monify:expense:added",
        onAdded as EventListener
      );
  }, []);

  if (loading) return <div>Loading entries...</div>;
  if (!items.length)
    return (
      <div className="p-4 text-gray-600 text-sm">
        No entries yet. Add your first expense.
      </div>
    );

  return (
    <div className="relative">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-700 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
              <th className="px-4 py-2 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((it) => (
              <tr key={it._id}>
                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                  {new Date(it.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2 font-medium text-gray-900">
                  {it.title}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {it.category || "—"}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-red-600">
                  {it.amount}
                  {/* ₹{it.amount.toLocaleString("en-IN")} */}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => setConfirmDelete(it._id)}
                    className="text-red-600 hover:text-red-800 text-sm underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Confirm Delete
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-2 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteItem(confirmDelete)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
