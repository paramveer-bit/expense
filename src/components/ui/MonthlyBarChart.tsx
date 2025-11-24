"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function MonthlyBarChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get("/api/expenses/summary?view=monthly");
      if (res.status !== 200) throw new Error("Failed");
      const json = res.data;
      // make human-friendly label month
      const normalized = (json || []).map((d: any) => {
        const [y, m] = d.date.split("-");
        const dt = new Date(Number(y), Number(m) - 1, 1);
        return {
          month: dt.toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          }),
          income: Number(d.income ?? 0),
          expense: Number(d.expense ?? 0),
        };
      });
      setData(normalized);
    } catch (err) {
      console.error(err);
      setData([]);
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
  }, []);

  if (loading)
    return (
      <div className="p-4 text-sm text-gray-500">Loading monthly chart...</div>
    );
  if (!data.length)
    return (
      <div className="p-4 text-sm text-gray-500">No monthly data yet.</div>
    );

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h4 className="font-medium mb-3">Monthly Income vs Expenses</h4>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
            />
            <Legend />
            <Bar
              dataKey="income"
              name="Income"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="expense"
              name="Expense"
              fill="#0d9488"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
