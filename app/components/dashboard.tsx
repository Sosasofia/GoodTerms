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

export function Dashboard({ group, items, viewerId, onUpdate }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<"expense" | "settlement">("expense");

    const balances = useMemo(() => {
        const bal: Record<string, number> = {};
        group.members.forEach((u) => (bal[u.name] = 0));
        items.forEach((item) => {
            if (item.type === "expense") {
                item.splits.forEach((split) => {
                    if (item.payer.name !== split.debtor.name) {
                        bal[item.payer.name] = (bal[item.payer.name] || 0) + split.amount;
                        bal[split.debtor.name] = (bal[split.debtor.name] || 0) - split.amount;
                    }
                });
            } else {
                bal[item.sender.name] = (bal[item.sender.name] || 0) + item.amount;
                bal[item.receiver.name] = (bal[item.receiver.name] || 0) - item.amount;
            }
        });
        return bal;
    }, [items, group]);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-end mb-6 border-b pb-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">{group.name}</h2>
                    <p className="text-sm text-slate-500">Code: <span className="font-mono bg-slate-200 px-1 rounded">{group.code}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-8">
                {group.members.map((u) => {
                    const bal = balances[u.name] || 0;
                    return (
                        <div key={u.id} className={`p-2 rounded-lg text-center border ${bal >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                            <div className="font-bold text-sm truncate">{u.name}</div>
                            <div className={`font-bold ${bal >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {bal >= 0 ? "+" : ""}{bal.toFixed(0)}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex mb-4 bg-white rounded-lg p-1 shadow-sm">
                <button onClick={() => setActiveTab("expense")} className={`flex-1 py-2 rounded font-bold ${activeTab === "expense" ? "bg-blue-100 text-blue-700" : "text-slate-500"}`}>Add Expense</button>
                <button onClick={() => setActiveTab("settlement")} className={`flex-1 py-2 rounded font-bold ${activeTab === "settlement" ? "bg-green-100 text-green-700" : "text-slate-500"}`}>Settle Up</button>
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
