"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";

export default function TopExpensesList({ limit = 5 }: { limit?: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/expenses/top?limit=${limit}`);

      if (res.status !== 200) throw new Error("fail");
      console.log("Top expenses response:", res);
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    function refresh() {
      load();
    }
    window.addEventListener("monify:expense:added", refresh as EventListener);
    return () =>
      window.removeEventListener(
        "monify:expense:added",
        refresh as EventListener
      );
  }, [limit]);

  if (loading)
    return (
      <div className="p-4 text-sm text-gray-500">Loading top expenses...</div>
    );
  if (!items.length)
    return <div className="p-4 text-sm text-gray-500">No expenses yet.</div>;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h4 className="font-medium mb-3">Top {limit} Expenses</h4>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it._id} className="flex justify-between items-start">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-gray-500">
                {new Date(it.date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                ₹{Number(it.amount).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-gray-500">{it.name || "—"}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
