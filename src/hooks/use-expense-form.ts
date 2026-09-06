import { useCallback, useState } from "react";
import { Group, Transaction } from "@/lib/types";
import { createExpense, updateExpense } from "@/lib/api";

const formatDateForInput = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export function useExpenseForm(
  group: Group,
  onSuccess: () => void,
  initialExpense?: Transaction | null,
) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [payerId, setPayerId] = useState(group.members[0]?.id || "");
  const [involved, setInvolved] = useState<string[]>(
    group.members.map((m) => m.id),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setDesc("");
    setAmount("");
    setNote("");
    setDueDate("");
    setPayerId(group.members[0]?.id || "");
    setInvolved(group.members.map((m) => m.id));
  }, [group.members]);

  const [prevExpense, setPrevExpense] = useState<Transaction | null>(
    initialExpense || null,
  );

  if (initialExpense !== prevExpense) {
    setPrevExpense(initialExpense || null);

    if (!initialExpense || initialExpense.type !== "expense") {
      resetForm();
    } else {
      setDesc(initialExpense.description);
      setAmount(String(initialExpense.amount));
      setNote(initialExpense.note || "");
      setDueDate(formatDateForInput(initialExpense.dueDate || null));
      setPayerId(initialExpense.payer.id);
      setInvolved(initialExpense.splits.map((split) => split.debtor.id));
    }
  }

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
      const splitAmount = Number((parsedAmount / involved.length).toFixed(2));

      const payload = {
        description: desc.trim(),
        amount: parsedAmount,
        note,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
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
      const rawMessage = error?.message || "An unexpected error occurred.";
      const safeMessage = rawMessage.includes("Unknown argument")
        ? "Could not save the expense. Please check the entry details and try again."
        : rawMessage;

      setErrorMessage(safeMessage);
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
    dueDate,
    setDueDate,
    payerId,
    setPayerId,
    involved,
    toggleUser,
    isLoading,
    errorMessage,
    handleSubmit,
  };
}
