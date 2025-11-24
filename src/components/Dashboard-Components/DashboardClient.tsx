"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ExpenseList from "./ExpenseList";
import StatCard from "./StatCard";
import TopCategories from "./TopCategories";
import MonthlyBarChart from "@/components/ui/MonthlyBarChart";
import SavingsLineChart from "@/components/ui/SavingsLineChart";
import CategoryDonutChart from "@/components/ui/CategoryDonutChart";
import TopExpensesList from "@/components/ui/TopExpensesList";
import CategoriesManager from "@/components/ui/CategoriesManager";
import ProfilePanel from "@/components/ui/ProfilePanel";
import { useUser } from "@/components/providers/UserProvider"; // ensure this path matches your project
import {
  ResponsiveContainer,
  LineChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import axios from "axios";

function formatTick(label: string, view: string) {
  try {
    if (view === "daily") {
      const d = new Date(label + "T00:00:00");
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    }
    if (view === "weekly") {
      if (label.includes("-")) {
        const [, w] = label.split("-");
        return `W${w}`;
      }
      return label;
    }
    if (view === "monthly") {
      const [y, m] = label.split("-");
      if (!y || !m) return label;
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    }
    return label;
  } catch {
    return label;
  }
}

function formatCurrency(v: number | string) {
  const n = Number(v || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const selectedView = (searchParams?.get("view") || "overview").toString();

  const { user } = useUser();

  // keep summary-driven numbers for expenses; income will prefer user.monthlyIncome when available
  const [income, setIncome] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [view, setView] = useState<"daily" | "weekly" | "monthly" | "yearly">(
    "daily"
  );
  const [loadingChart, setLoadingChart] = useState<boolean>(true);

  const tickRotation = useMemo(() => {
    if (!trendData || trendData.length <= 8) return 0;
    if (trendData.length <= 16) return -20;
    return -30;
  }, [trendData]);

  // Load summary (expenses + API income/balance). We then override income/balance if user.monthlyIncome exists.
  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const res = await axios.get("/api/expenses/summary?view=summary");
      // console.log("Summary response:", res);
      if (res.status !== 200) throw new Error("Failed to load summary");
      const json = res.data || {};

      const apiIncome = Number(json.income ?? 0);
      const apiExpenses = Number(json.expenses ?? 0);
      const apiBalance = Number(json.balance ?? 0);

      // Set expenses from API always (authoritative)
      setExpenses(apiExpenses);

      // If user provided monthlyIncome, use it as the income and compute balance = income - expenses.
      if (typeof user?.monthlyIncome === "number") {
        const uiIncome = Number(user.monthlyIncome);
        setIncome(uiIncome);
        setBalance(uiIncome - apiExpenses);
      } else {
        // fallback to API-provided values
        setIncome(apiIncome);
        setBalance(apiBalance);
      }
    } catch (err) {
      console.error("loadSummary error", err);
      // fallback values: prefer user value for income if present
      setExpenses(0);
      if (typeof user?.monthlyIncome === "number") {
        setIncome(Number(user.monthlyIncome));
        setBalance(Number(user.monthlyIncome));
      } else {
        setIncome(0);
        setBalance(0);
      }
    } finally {
      setLoadingSummary(false);
    }
  }

  async function loadChart() {
    setLoadingChart(true);
    try {
      const res = await axios.get(`/api/expenses/summary?view=${view}`);
      console.log("Chart response:", res);
      if (res.status !== 200) throw new Error("Failed to load chart");
      const data = res.data || [];
      const normalized = (data || []).map((d: any) => ({
        ...d,
        income: Number(d.income ?? 0),
        expense: Number(d.expense ?? 0),
      }));
      setTrendData(normalized);
    } catch (err) {
      console.error("loadChart error", err);
      setTrendData([]);
    } finally {
      setLoadingChart(false);
    }
  }

  useEffect(() => {
    // Load summary on mount and whenever user's monthlyIncome changes so dashboard reflects persisted income immediately.
    loadSummary();
    const refresh = () => loadSummary();
    window.addEventListener("monify:expense:added", refresh as EventListener);
    window.addEventListener("monify:user:updated", refresh as EventListener);
    return () => {
      window.removeEventListener(
        "monify:expense:added",
        refresh as EventListener
      );
      window.removeEventListener(
        "monify:user:updated",
        refresh as EventListener
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.monthlyIncome]);

  useEffect(() => {
    loadChart();
    const refresh = () => loadChart();
    window.addEventListener("monify:expense:added", refresh as EventListener);
    return () =>
      window.removeEventListener(
        "monify:expense:added",
        refresh as EventListener
      );
  }, [view]);

  // Views handling (categories / analytics / profile) unchanged
  if (selectedView === "categories") {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9">
          <h1 className="text-2xl font-semibold mb-4">Categories</h1>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <CategoriesManager />
          </div>
        </div>

        {/* empty aside to keep layout consistent */}
        <aside className="col-span-12 lg:col-span-3" />
      </div>
    );
  }

  if (selectedView === "analytics") {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9">
          <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
          <div
            id="analytics-content"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <MonthlyBarChart />
            <SavingsLineChart />
            <CategoryDonutChart />
            <TopExpensesList limit={5} />
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-3">
          <TopCategories />
        </aside>
      </div>
    );
  }

  if (selectedView === "profile") {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9">
          <ProfilePanel />
        </div>

        <aside className="col-span-12 lg:col-span-3">
          <TopCategories />
        </aside>
      </div>
    );
  }

  // Default dashboard overview
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-9">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Balance"
            value={balance}
            subtitle={loadingSummary ? "Loading…" : undefined}
            accent="neutral"
          />
          <StatCard
            title="Income"
            value={income}
            subtitle="Total"
            accent="green"
          />
          <StatCard
            title="Expenses"
            value={expenses}
            subtitle="Total"
            accent="red"
          />
        </div>

        {/* Trend chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-800">Income vs Expenses</h3>
            <div className="flex gap-2 text-sm">
              {["daily", "weekly", "monthly", "yearly"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v as any)}
                  className={`px-3 py-1 rounded ${
                    view === v
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loadingChart ? (
            <div className="text-sm text-gray-500">Loading chart…</div>
          ) : trendData.length === 0 ? (
            <div className="text-sm text-gray-500">No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="gradIncome" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpense" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={
                    {
                      fontSize: 11,
                      angle: tickRotation,
                      textAnchor: tickRotation ? "end" : "middle",
                    } as any
                  }
                  tickFormatter={(label) => formatTick(label, view)}
                  interval={Math.max(0, Math.floor(trendData.length / 8))}
                />
                <YAxis tickFormatter={(v) => `${formatCurrency(v)}`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={(label: string) => formatTick(label, view)}
                />
                <Legend verticalAlign="bottom" height={36} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="transparent"
                  fill="url(#gradIncome)"
                  activeDot={false}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="transparent"
                  fill="url(#gradExpense)"
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense List */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium mb-3">All Entries</h4>
          <ExpenseList />
        </div>
      </div>

      <aside className="col-span-3 space-y-4">
        <TopCategories />
      </aside>
    </div>
  );
}
