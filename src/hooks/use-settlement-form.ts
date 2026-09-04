import { useState, useMemo } from "react";
import { Group, Transaction } from "../lib/types";
import { createSettlement } from "../lib/api";

export interface UnpaidDebt {
  id: string;
  amount: number;
  expenseDescription: string;
  receiverName: string;
  receiverId: string;
  isPaid?: boolean;
  splitIds?: string[];
  offsetSplitIds?: string[];
}

export function useSettlementForm(
  group: Group,
  items: Transaction[],
  viewerId: string,
  onSuccess: () => void,
) {
  const [senderId, setSenderId] = useState(
    viewerId || group.members[0]?.id || "",
  );
  const [selectedDebt, setSelectedDebt] = useState<UnpaidDebt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unpaidDebts: UnpaidDebt[] = useMemo(() => {
    return (items || [])
      .filter((item) => item.type === "expense")
      .flatMap((item) => {
        return item.splits
          .filter((s) => s.debtor.id === senderId)
          .filter((s) => item.payer?.id !== senderId)
          .filter((s) => !s.isPaid)
          .map((s) => ({
            id: s.id,
            amount: s.amount,
            isPaid: s.isPaid,
            expenseDescription: item.description,
            receiverName: item.payer?.name || "Unknown",
            receiverId: item.payer?.id || "",
            splitIds: [s.id],
            offsetSplitIds: [],
          }));
      });
  }, [items, senderId]);

  const handleInitiatePayment = (debt: UnpaidDebt) => {
    setErrorMessage(null);
    if (!debt.receiverId) {
      setErrorMessage("Error: Cannot identify who to pay.");
      return;
    }
    setSelectedDebt(debt);
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebt) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await createSettlement({
        amount: selectedDebt.amount,
        senderId,
        receiverId: selectedDebt.receiverId,
        splitId: selectedDebt.id,
        splitIds: selectedDebt.splitIds || [],
        offsetSplitIds: selectedDebt.offsetSplitIds || [],
        groupId: group.id,
      });

      onSuccess();
      setSelectedDebt(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process payment.");
      setSelectedDebt(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    senderId,
    setSenderId,
    unpaidDebts,
    selectedDebt,
    setSelectedDebt,
    isSubmitting,
    errorMessage,
    handleInitiatePayment,
    handleConfirmPayment,
  };
}
