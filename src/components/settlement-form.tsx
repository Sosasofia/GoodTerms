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

  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unpaidDebts = (items || [])
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

  function handleInitiatePayment(debt: any) {
    if (!debt.receiverId) {
      alert("Error: Cannot identify who to pay.");
      return;
    }
    setSelectedDebt(debt);
  }

  async function handleConfirmPayment() {
    if (!selectedDebt) return;

    try {
      setIsSubmitting(true);
      await createSettlement({
        amount: selectedDebt.amount,
        senderId,
        receiverId: selectedDebt.receiverId,
        splitId: selectedDebt.id,
        groupId: group.id,
      });

      onSuccess();
      setSelectedDebt(null);
    } catch (err: any) {
      alert("Failed to pay: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
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
          <p className="text-slate-400 italic">
            No pending debts for this user.
          </p>
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
                    onClick={() => handleInitiatePayment(debt)}
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

      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-green-50 p-6 text-center border-b border-green-100">
              <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Confirm Payment
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you marking this debt as paid?
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-sm">Amount</span>
                <span className="text-xl font-bold text-green-600">
                  ${selectedDebt.amount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-slate-500">For:</span>
                <span className="font-medium text-slate-700">
                  {selectedDebt.expenseDescription}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-slate-500">To:</span>
                <span className="font-medium text-slate-700">
                  {selectedDebt.receiverName}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex gap-3">
              <button
                onClick={() => setSelectedDebt(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md shadow-green-200 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Yes, Paid"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
