"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function SavingsLineChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get("/api/expenses/summary?view=monthly");
      if (res.status !== 200) throw new Error("Failed");
      const json = res.data;
      const normalized = (json || []).map((d: any) => {
        const [y, m] = d.date.split("-");
        const dt = new Date(Number(y), Number(m) - 1, 1);
        return {
          month: dt.toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          }),
          savings: Number(d.income ?? 0) - Number(d.expense ?? 0),
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
    return <div className="p-4 text-sm text-gray-500">Loading savings...</div>;
  if (!data.length)
    return (
      <div className="p-4 text-sm text-gray-500">No savings data yet.</div>
    );

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h4 className="font-medium mb-3">Monthly Savings (Income − Expense)</h4>
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
            />
            <Line
              type="monotone"
              dataKey="savings"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
