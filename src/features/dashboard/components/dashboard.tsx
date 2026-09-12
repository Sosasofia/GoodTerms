"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Expense, Group } from "../../../lib/types";
import { ExpenseForm } from "./expense-form";
import { HistoryList } from "./history-list";
import { SettlementsPanel } from "./settlements-panel";
import { calculateBalances } from "@/services/balances";

interface DashboardProps {
  group: Group;
  items: Expense[];
  viewerId: string;
  onUpdate: () => void;
  loading?: boolean;
  editingExpense?: Expense | null;
  onEditExpense?: (item: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onCancelEdit?: () => void;
}

export function Dashboard({
  group,
  items,
  viewerId,
  onUpdate,
  loading,
  editingExpense,
  onEditExpense,
  onDeleteExpense,
  onCancelEdit,
}: DashboardProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"expense" | "settlement">(
    "expense",
  );
  const [groupState, setGroupState] = useState(group);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGroupState(group);
  }, [group]);

  useEffect(() => {
    if (editingExpense) {
      setActiveTab("expense");
    }
  }, [editingExpense]);

  const handleEditExpense = (item: Expense) => {
    onEditExpense?.(item);

    const scrollContainer = dashboardRef.current?.closest("main");
    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const balances = useMemo(() =>
    calculateBalances(groupState, items),
    [items, groupState]);

  return (
    <div ref={dashboardRef} className="max-w-2xl mx-auto">
      <div className="flex justify-between items-end mb-6 border-b pb-4">
        <h2 className="text-3xl font-extrabold text-slate-900">
          {groupState.name}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        {group.members.map((u) => {
          const bal = balances[u.id] || 0;
          const isPositive = bal >= 0;
          return (
            <div
              key={u.id}
              className={`p-2 rounded-lg text-center border transition-colors ${isPositive
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
                }`}
            >
              <div className="font-bold text-sm truncate text-slate-700">
                {u.name}
              </div>
              <div
                className={`font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
              >
                {isPositive ? "+" : ""}
                {bal.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex mb-4 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
        <button
          onClick={() => setActiveTab("expense")}
          className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${activeTab === "expense"
            ? "bg-blue-100 text-blue-700 shadow-sm"
            : "text-slate-500 hover:bg-slate-50"
            }`}
        >
          Add Expense
        </button>
        <button
          onClick={() => setActiveTab("settlement")}
          className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${activeTab === "settlement"
            ? "bg-green-100 text-green-700 shadow-sm"
            : "text-slate-500 hover:bg-slate-50"
            }`}
        >
          Settle Up
        </button>
      </div>

      <div className="mb-8">
        {activeTab === "expense" ? (
          <ExpenseForm
            group={groupState}
            onSuccess={onUpdate}
            initialExpense={editingExpense}
            onCancel={onCancelEdit}
          />
        ) : (
          <SettlementsPanel
            group={groupState}
            items={items}
            viewerId={viewerId}
            onSuccess={onUpdate}
          />
        )}
      </div>

      <HistoryList
        items={items}
        onEditExpense={handleEditExpense}
        onDeleteExpense={onDeleteExpense}
      />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="flex justify-between items-end mb-6 border-b pb-4">
        <div>
          <div className="h-9 w-48 bg-slate-200 rounded-md mb-3" />
          <div className="flex gap-3">
            <div className="h-6 w-32 bg-slate-100 rounded-md" />
            <div className="h-6 w-24 bg-yellow-50 rounded-md" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-2 rounded-lg border border-slate-100 bg-slate-50/50"
          >
            <div className="h-4 w-12 bg-slate-200 rounded mx-auto mb-2" />
            <div className="h-5 w-8 bg-slate-300 rounded mx-auto" />
          </div>
        ))}
      </div>

      <div className="h-12 w-full bg-slate-100 rounded-lg mb-8" />

      <div className="space-y-4">
        <div className="h-6 w-24 bg-slate-200 rounded mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 w-full bg-slate-50 border border-slate-100 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
