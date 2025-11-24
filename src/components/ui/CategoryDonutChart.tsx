"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#0d9488", "#2563eb", "#f59e0b", "#ef4444", "#6b7280"];

export default function CategoryDonutChart() {
  const [data, setData] = useState<{ category: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get("/api/expenses/categories");
      if (res.status !== 200) throw new Error("fail");
      const json = res.data;
      setData(
        json.map((d: any) => ({ category: d.category, total: Number(d.total) }))
      );
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
      <div className="p-4 text-sm text-gray-500">Loading categories...</div>
    );
  if (!data.length)
    return (
      <div className="p-4 text-sm text-gray-500">No category data yet.</div>
    );

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h4 className="font-medium mb-3">Spending Breakdown</h4>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
