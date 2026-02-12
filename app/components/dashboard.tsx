"use client";

import { useState, useMemo } from "react";
import { Group, Transaction } from "../lib/types";
import { ExpenseForm } from "./expense-form";
import { HistoryList } from "./history-list";
import { SettlementForm } from "./settlement-form";

interface DashboardProps {
  group: Group;
  items: Transaction[];
  viewerId: string;
  onUpdate: () => void;
}

export function Dashboard({
  group,
  items,
  viewerId,
  onUpdate,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"expense" | "settlement">(
    "expense",
  );

  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    group.members.forEach((u) => (bal[u.name] = 0));

    (items || []).forEach((item) => {
      if (item.type === "expense") {
        const payerName = item.payer?.name || "Unknown";
        item.splits.forEach((split) => {
          const debtorName = split.debtor?.name || "Unknown";
          if (payerName !== debtorName) {
            bal[payerName] = (bal[payerName] || 0) + split.amount;
            bal[debtorName] = (bal[debtorName] || 0) - split.amount;
          }
        });
      } else {
        const senderName = item.sender?.name || "Unknown";
        const receiverName = item.receiver?.name || "Unknown";

        bal[senderName] = (bal[senderName] || 0) + item.amount;
        bal[receiverName] = (bal[receiverName] || 0) - item.amount;
      }
    });
    return bal;
  }, [items, group]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-end mb-6 border-b pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            {group.name}
          </h2>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm font-medium">
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md font-mono border border-slate-200">
              Code:{" "}
              <span className="font-bold text-slate-900 select-all">
                {group.code}
              </span>
            </span>

            {group.pin && (
              <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-md font-mono border border-yellow-200 flex items-center gap-1">
                🔒 PIN:{" "}
                <span className="font-bold select-all">{group.pin}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        {group.members.map((u) => {
          const bal = balances[u.name] || 0;
          const isPositive = bal >= 0;
          return (
            <div
              key={u.id}
              className={`p-2 rounded-lg text-center border transition-colors ${
                isPositive
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
          className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${
            activeTab === "expense"
              ? "bg-blue-100 text-blue-700 shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Add Expense
        </button>
        <button
          onClick={() => setActiveTab("settlement")}
          className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${
            activeTab === "settlement"
              ? "bg-green-100 text-green-700 shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Settle Up
        </button>
      </div>

      <div className="mb-8">
        {activeTab === "expense" ? (
          <ExpenseForm group={group} onSuccess={onUpdate} />
        ) : (
          <SettlementForm
            group={group}
            items={items}
            viewerId={viewerId}
            onSuccess={onUpdate}
          />
        )}
      </div>

      <HistoryList items={items} />
    </div>
  );
}
