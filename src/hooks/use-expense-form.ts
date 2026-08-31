import { useEffect, useState } from "react";
import { Group, Transaction } from "@/lib/types";
import { createExpense, updateExpense } from "@/lib/api";

export function useExpenseForm(
  group: Group,
  onSuccess: () => void,
  initialExpense?: Transaction | null,
) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payerId, setPayerId] = useState(group.members[0]?.id || "");
  const [involved, setInvolved] = useState<string[]>(
    group.members.map((m) => m.id),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setDesc("");
    setAmount("");
    setNote("");
    setPayerId(group.members[0]?.id || "");
    setInvolved(group.members.map((m) => m.id));
  };

  useEffect(() => {
    if (!initialExpense || initialExpense.type !== "expense") {
      resetForm();
      return;
    }

    setDesc(initialExpense.description);
    setAmount(String(initialExpense.amount));
    setNote(initialExpense.note || "");
    setPayerId(initialExpense.payer.id);
    setInvolved(initialExpense.splits.map((split) => split.debtor.id));
  }, [group.members, initialExpense]);

  const toggleUser = (userId: string) => {
    if (involved.includes(userId)) {
      setInvolved(involved.filter((id) => id !== userId));
    } else {
      setInvolved([...involved, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than zero.");
      return;
    }
    if (involved.length === 0) {
      setErrorMessage("At least one person must be involved in the split.");
      return;
    }

    setIsLoading(true);

    try {
      const splitAmount = parsedAmount / involved.length;
      const payload = {
        description: desc.trim(),
        amount: parsedAmount,
        note,
        payerId,
        splits: involved.map((memberId) => ({
          debtorId: memberId,
          amount: splitAmount,
        })),
      };

      if (initialExpense && initialExpense.type === "expense") {
        await updateExpense(group.id, initialExpense.id, payload);
      } else {
        await createExpense(group.id, payload);
      }

      resetForm();
      setIsLoading(false);
      onSuccess();
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return {
    desc,
    setDesc,
    amount,
    setAmount,
    note,
    setNote,
    payerId,
    setPayerId,
    involved,
    toggleUser,
    isLoading,
    errorMessage,
    handleSubmit,
  };
}