"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";

export default function TopCategories() {
  const searchParams = useSearchParams();
  const view = (searchParams?.get("view") || "").toString();

  // Hide this component for these views
  const hide = ["analytics", "categories", "profile"].includes(view);

  const [items, setItems] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await axios.get("/api/expenses/categories");
      if (res.status === 200) {
        const data = res.data || [];
        const formatted = data.map((d: any) => ({
          name: d.category || "Uncategorized",
          value: Number(d.total || 0),
        }));
        setItems(formatted);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hide) {
      loadCategories();
    }

    function onAdded() {
      if (!hide) loadCategories();
    }

    window.addEventListener("monify:expense:added", onAdded as EventListener);
    return () =>
      window.removeEventListener(
        "monify:expense:added",
        onAdded as EventListener
      );
  }, [hide]);

  // --- Fully hide component ---
  if (hide) return null;

  if (loading)
    return (
      <div>
        <h4 className="font-medium mb-3">Top Categories</h4>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );

  if (!items.length)
    return (
      <div>
        <h4 className="font-medium mb-3">Top Categories</h4>
        <p className="text-sm text-gray-500">No expense data yet.</p>
      </div>
    );

  const max = Math.max(...items.map((l) => l.value));

  return (
    <div>
      <h4 className="font-medium mb-3">Top Categories</h4>
      <div className="space-y-3">
        {items.map((l, i) => {
          const pct = max > 0 ? Math.round((l.value / max) * 100) : 0;

          return (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span>{l.name}</span>
                <span>₹{l.value.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded">
                <div
                  style={{ width: `${pct}%` }}
                  className="h-2 rounded bg-gradient-to-r from-teal-600 to-blue-600"
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
