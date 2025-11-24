"use client";
import React, { useEffect, useState } from "react";
import CategoryModal from "./CategoryModal";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import axios from "axios";

type Cat = {
  _id: string;
  name: string;
  type?: string;
  color?: string;
  budget?: number; // undefined when not set
  total: number;
};

const DEFAULT_COLORS = [
  "#0d9488",
  "#2563eb",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
  "#fde68a",
  "#dbeafe",
  "#bbf7d0",
  "#fee2e2",
  "#fce7f3",
  "#ede9fe",
];
const OTHER_COLOR = "#f3f4f6";

function money(v?: number) {
  return `₹${Number(v ?? 0).toLocaleString("en-IN")}`;
}

export default function CategoriesManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [chartData, setChartData] = useState<
    { name: string; value: number; color?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Cat | null>(null);

  // load categories and their totals
  async function load() {
    setLoading(true);
    try {
      // 1) fetch user categories

      const res = await axios.get("/api/categories");
      let saved: any[] = [];
      if (res.status === 200) {
        const json = res.data;
        saved = Array.isArray(json) ? json : json?.categories ?? [];
      } else {
        console.warn("/api/categories failed:", res.status);
      }

      // build lookup by id and by name (lowercase)
      const byId: Record<string, Cat> = {};
      const byNameLower: Record<string, Cat> = {};

      (saved || []).forEach((c: any, i: number) => {
        const id = String(c._id ?? c.id ?? `cat-${i}`);
        const name = String(c.name ?? id);
        const color = c.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const budget =
          c.budget !== undefined &&
          c.budget !== null &&
          !isNaN(Number(c.budget))
            ? Number(c.budget)
            : undefined;
        const cat: Cat = {
          _id: id,
          name,
          type: c.type,
          color,
          budget,
          total: 0,
        };
        byId[id] = cat;
        byNameLower[name.toLowerCase()] = cat;
      });

      // 2) fetch aggregated totals

      const tRes = await axios.get("/api/expenses/categories");
      let totals: any[] = [];
      if (tRes.status === 200) {
        const tj = tRes.data;
        totals = Array.isArray(tj) ? tj : tj?.totals ?? [];
      } else {
        console.warn("/api/expenses/categories failed:", tRes.status);
      }

      // accumulate totals - prefer categoryId (_id) if present
      let otherTotal = 0;
      for (const t of totals) {
        const amount = Number(t.total ?? t.amount ?? 0);
        // some aggregator shapes: { _id: "<categoryId or name>", total: 123, category: "Food" }
        const rawId = t._id ?? t.categoryId ?? t.category_id ?? null;
        const rawName = t.category ?? t.name ?? t._id ?? "Other";

        let matched = false;
        if (rawId && byId[String(rawId)]) {
          byId[String(rawId)].total += amount;
          matched = true;
        }

        if (!matched) {
          const key = String(rawName).trim().toLowerCase();
          if (byNameLower[key]) {
            byNameLower[key].total += amount;
            matched = true;
          }
        }

        if (!matched) {
          // if aggregator normalized to "Other" or category missing, add to other bucket
          if (String(rawName).trim().toLowerCase() === "other") {
            otherTotal += amount;
            matched = true;
          } else {
            otherTotal += amount;
          }
        }
      }

      // 3) build merged array
      const merged: Cat[] = Object.values(byId).map((c) => ({ ...c }));

      setCats(merged);
      setChartData(
        merged.map((c) => ({
          name: c.name,
          value: Number(c.total ?? 0),
          color: c.color,
        }))
      );
    } catch (err) {
      console.error("CategoriesManager.load error", err);
      setCats([]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("monify:expense:added", onRefresh as EventListener);
    return () =>
      window.removeEventListener(
        "monify:expense:added",
        onRefresh as EventListener
      );
  }, []);
  function openAdd() {
    setEdit(null);
    setOpen(true);
  }

  function openEdit(c: Cat) {
    if (c.name.toLowerCase() === "other") return;
    setEdit(c);
    setOpen(true);
  }
  // delete category
  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await axios.delete(
        `/api/categories?id=${encodeURIComponent(id)}`
      );
      if (res.status !== 200) {
        const json = res.data || {};
        if (res.status === 409) {
          const serverMsg = json?.error || "Category in use by expenses.";
          const shouldForce = confirm(
            `${serverMsg}\n\nReassign those expenses to Other and delete this category?`
          );
          if (!shouldForce) return;

          const delForce = await axios.delete(
            `/api/categories?id=${encodeURIComponent(id)}&force=true`
          );
          if (delForce.status !== 200) {
            const dj = delForce.data || {};
            alert(dj?.error || "Force delete failed");
            return;
          }
          await load();
          window.dispatchEvent(new CustomEvent("monify:expense:added"));
          return;
        }
        alert(json?.error || "Delete failed");
        return;
      }
      await load();
      window.dispatchEvent(new CustomEvent("monify:expense:added"));
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed (see console)");
    }
  }

  if (loading)
    return (
      <div className="p-4 text-sm text-gray-500">Loading categories...</div>
    );

  const maxTotal = Math.max(...cats.map((x) => Number(x.total ?? 0)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Manage Categories</h2>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow"
        >
          + Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c, idx) => {
          const used = Number(c.total ?? 0);
          const budget = c.budget; // undefined when not set
          const pct =
            budget && budget > 0
              ? Math.min(100, Math.round((used / budget) * 100))
              : Math.round((used / Math.max(maxTotal, 1)) * 100);
          const remaining: number | undefined =
            budget !== undefined ? budget - used : undefined;
          const bg = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const isOther = c.name.toLowerCase() === "other";

          const icon = (name: string) => {
            const n = name.toLowerCase();
            if (n.includes("food")) return "🍔";
            if (n.includes("travel")) return "🚗";
            if (n.includes("shopping")) return "🛒";
            if (n.includes("bills")) return "🧾";
            if (n.includes("health")) return "💊";
            if (n.includes("entertain")) return "🎬";
            if (n.includes("education")) return "🎓";
            if (n.includes("gift")) return "🎁";
            if (n.includes("groceries")) return "🛍️";
            return "🏷️";
          };

          return (
            <div key={c._id} className="p-4 rounded-lg shadow-sm bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: bg }}
                  >
                    {isOther ? "🔖" : icon(c.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      Track your spending
                    </div>
                  </div>
                </div>

                {!isOther && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-sm text-sky-600"
                      aria-label={`Edit ${c.name}`}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="text-sm text-red-600"
                      aria-label={`Delete ${c.name}`}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">{money(used)}</div>
                <div className="text-xs text-gray-500">
                  {budget !== undefined ? `${pct}% used` : `${pct}% of max`}
                </div>
              </div>

              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    style={{ width: `${pct}%`, background: bg }}
                    className="h-2"
                  />
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {budget !== undefined
                    ? remaining !== undefined && remaining >= 0
                      ? `${money(remaining)} remaining`
                      : `Over budget by ${money(Math.abs(remaining ?? 0))}`
                    : "No budget set"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        <h4 className="font-medium mb-3">Spending Breakdown</h4>
        {chartData.length === 0 ? (
          <div className="text-sm text-gray-500">No data yet.</div>
        ) : (
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <CategoryModal
        open={open}
        edit={edit}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          load();
          window.dispatchEvent(new CustomEvent("monify:expense:added"));
        }}
      />
    </div>
  );
}
