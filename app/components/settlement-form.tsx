"use client";

import { useState, useMemo, useEffect } from "react";
import { Group, Transaction } from "../lib/types";
import { createSettlement } from "../lib/api";

interface SettlementFormProps {
    group: Group;
    items: Transaction[];
    viewerId: string;
    onSuccess: () => void;
}

export function SettlementForm({ group, items, viewerId, onSuccess }: SettlementFormProps) {
    const [senderId, setSenderId] = useState(viewerId || group.members[0]?.id || "");

    useEffect(() => {
        if (viewerId) setSenderId(viewerId);
    }, [viewerId]);

    const myUnpaidDebts = useMemo(() => {
        return items
            .filter((i) => i.type === "expense")
            .flatMap((e: any) => e.splits)
            .filter((s: any) => s.debtorId === senderId && !s.isPaid)
            .map((s: any) => {
                const parent = items.find((i) => i.id === s.expenseId);
                const payer = group.members.find((m) => m.id === (parent as any)?.payerId);
                return {
                    ...s,
                    description: (parent as any)?.description || "Expense",
                    receiver: payer
                };
            });
    }, [items, senderId, group.members]);

    async function handlePayDebt(splitId: number, amount: number, receiverId: string, description: string) {
        if (!confirm(`Mark "${description}" ($${amount}) as PAID?`)) return;

        if (!receiverId) {
            alert("Error: Cannot identify who to pay. The data might be incomplete.");
            return;
        }

        try {
            await createSettlement({
                amount,
                senderId,
                receiverId,
                splitId,
                groupId: group.id,
            });
            onSuccess();
        } catch (err: any) {
            alert("Failed to pay: " + err.message);
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
            <div className="mb-4">
                <label className="text-xs font-bold text-slate-500 block mb-1">
                    WHO IS PAYING?
                </label>
                <select
                    className="w-full border p-2 rounded bg-green-50 text-green-800 font-bold"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                >
                    {group.members.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>
            </div>

            <h3 className="font-bold text-slate-700 mb-2">Unpaid Debts</h3>

            {myUnpaidDebts.length === 0 ? (
                <p className="text-slate-400 italic">No pending debts for this user.</p>
            ) : (
                <div className="space-y-3">
                    {myUnpaidDebts.map((debt: any) => (
                        <div
                            key={debt.id}
                            className="flex justify-between items-center border p-3 rounded-lg hover:bg-slate-50"
                        >
                            <div>
                                <div className="font-bold">{debt.description}</div>
                                <div className="text-xs text-slate-500">
                                    Owed to {debt.receiver?.name}
                                </div>
                            </div>
                            <button
                                onClick={() =>
                                    handlePayDebt(
                                        debt.id,
                                        debt.amount,
                                        debt.receiver?.id,
                                        debt.description
                                    )
                                }
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-bold cursor-pointer"
                            >
                                Pay ${debt.amount.toFixed(0)}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
