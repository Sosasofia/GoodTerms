"use client";

import { useState } from "react";
import { Group, Transaction } from "../lib/types";
import { createSettlement } from "../lib/api";
import { LoadingSpinner } from "./loading-spinner";

interface SettlementFormProps {
  group: Group;
  items: Transaction[];
  viewerId: string;
  onSuccess: () => void;
}

export function SettlementForm({
  group,
  items,
  viewerId,
  onSuccess,
}: SettlementFormProps) {
  const [senderId, setSenderId] = useState(
    viewerId || group.members[0]?.id || "",
  );

  const [processingId, setProcessingId] = useState<string | null>(null);

  const unpaidDebts = items
    .filter((item) => item.type === "expense")
    .flatMap((item) => {
      return item.splits
        .filter((s) => s.debtor.id === senderId)
        .filter((s) => item.payer.id !== senderId)
        .filter((s) => !s.isPaid)
        .map((s) => ({
          ...s,
          expenseDescription: item.description,
          receiverName: item.payer?.name,
          receiverId: item.payer?.id,
        }));
    });

  async function handleSubmit(
    splitId: string,
    amount: number,
    receiverId: string,
    description: string,
  ) {
    if (!confirm(`Mark "${description}" ($${amount.toFixed(2)}) as PAID?`))
      return;

    if (!receiverId) {
      alert("Error: Cannot identify who to pay.");
      return;
    }

    setProcessingId(splitId);

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
    } finally {
      setProcessingId(null);
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

      {unpaidDebts.length === 0 ? (
        <p className="text-slate-400 italic">No pending debts for this user.</p>
      ) : (
        <div className="space-y-3">
          {unpaidDebts.map((debt: any) => {
            const isItemLoading = processingId === debt.id;
            const isLoading = processingId !== null;

            return (
              <div
                key={debt.id}
                className="flex justify-between items-center border p-3 rounded-lg hover:bg-slate-50"
              >
                <div>
                  <div className="font-bold">{debt.expenseDescription}</div>
                  <div className="text-xs text-slate-500">
                    Owed to {debt.receiverName}
                  </div>
                </div>
                <button
                  disabled={isLoading}
                  onClick={() =>
                    handleSubmit(
                      debt.id,
                      debt.amount,
                      debt.receiverId,
                      debt.expenseDescription,
                    )
                  }
                  className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white px-3 py-1 rounded-lg text-sm font-bold cursor-pointer transition-colors min-w-25 flex justify-center"
                >
                  {isItemLoading ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    `Pay $${debt.amount.toFixed(2)}`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
