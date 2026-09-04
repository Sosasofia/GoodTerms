import { Group, Transaction } from "@/lib/types";

export interface SettlementSuggestion {
  fromUserId: string;
  toUserId: string;
  amount: number;
  splitIds?: string[];
  offsetSplitIds?: string[];
  dueDate?: string | null;
}

export type SettlementSuggestionMode = "total" | "dueDate" | "settleAll";

interface OutstandingDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
  splitIds: string[];
  offsetSplitIds?: string[];
  dueDate: string | null;
}

export function calculateBalances(group: Group, items: Transaction[]) {
  const bal: Record<string, number> = {};

  group.members.forEach((u) => (bal[u.id] = 0));

  (items || []).forEach((item) => {
    if (item.type === "expense") {
      const payerId = item.payer?.id || "unknown";
      item.splits.forEach((split) => {
        const debtorId = split.debtor?.id || "unknown";
        if (payerId !== debtorId) {
          bal[payerId] = (bal[payerId] || 0) + split.amount;
          bal[debtorId] = (bal[debtorId] || 0) - split.amount;
        }
      });
    } else {
      const senderId = item.sender?.id || "unknown";
      const receiverId = item.receiver?.id || "unknown";

      bal[senderId] = (bal[senderId] || 0) + item.amount;
      bal[receiverId] = (bal[receiverId] || 0) - item.amount;
    }
  });

  return bal;
}

export function getOptimizedSettlements(
  group: Group,
  items: Transaction[],
): SettlementSuggestion[] {
  const balances = calculateBalances(group, items);
  const entries = group.members
    .map((member) => ({
      id: member.id,
      name: member.name,
      amount: balances[member.id] || 0,
    }))
    .filter((entry) => Math.abs(entry.amount) > 0.01);

  const debtors = entries
    .filter((entry) => entry.amount < 0)
    .map((entry) => ({
      ...entry,
      amount: Math.abs(entry.amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = entries
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const suggestions: SettlementSuggestion[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const transferAmount = Math.min(debtor.amount, creditor.amount);
    if (transferAmount <= 0.01) {
      debtorIndex += 1;
      creditorIndex += 1;
      continue;
    }

    suggestions.push({
      fromUserId: debtor.id,
      toUserId: creditor.id,
      amount: Number(transferAmount.toFixed(2)),
    });

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount <= 0.01) {
      debtorIndex += 1;
    }

    if (creditor.amount <= 0.01) {
      creditorIndex += 1;
    }
  }

  return suggestions.sort((a, b) => b.amount - a.amount);
}

export function getUserSettlementSuggestions(
  group: Group,
  items: Transaction[],
  payerId: string,
  mode: SettlementSuggestionMode = "total",
): SettlementSuggestion[] {
  const outgoing = getOutstandingDebts(items, payerId);

  if (mode === "dueDate") {
    return outgoing.sort(compareDueDates).map(toSuggestion);
  }

  const totals = new Map<string, OutstandingDebt>();
  for (const debt of outgoing) {
    const current = totals.get(debt.toUserId) || {
      fromUserId: payerId,
      toUserId: debt.toUserId,
      amount: 0,
      splitIds: [],
      dueDate: null,
    };
    current.amount += debt.amount;
    current.splitIds.push(...debt.splitIds);
    if (
      debt.dueDate &&
      (!current.dueDate ||
        new Date(debt.dueDate).getTime() < new Date(current.dueDate).getTime())
    ) {
      current.dueDate = debt.dueDate;
    }
    totals.set(debt.toUserId, current);
  }

  const totalSuggestions = [...totals.values()];

  if (mode === "settleAll") {
    return totalSuggestions
      .map((suggestion) => {
        const reverseDebts = getOutstandingDebts(
          items,
          suggestion.toUserId,
        ).filter((debt) => debt.toUserId === payerId);

        const reverseTotal = reverseDebts.reduce(
          (sum, debt) => sum + debt.amount,
          0,
        );

        return {
          ...suggestion,
          amount: Number((suggestion.amount - reverseTotal).toFixed(2)),
          splitIds: suggestion.splitIds,
          offsetSplitIds: reverseDebts.flatMap((debt) => debt.splitIds),
        };
      })
      .filter((suggestion) => suggestion.amount > 0.01)
      .map(toSuggestion);
  }

  return totalSuggestions.map(toSuggestion);
}

function getOutstandingDebts(
  items: Transaction[],
  fromUserId: string,
): OutstandingDebt[] {
  const debts: OutstandingDebt[] = [];
  for (const item of items) {
    if (item.type !== "expense" || !item.payer) continue;
    if (item.payer.id === fromUserId) continue;

    for (const split of item.splits || []) {
      if (split.debtor.id !== fromUserId || split.isPaid) continue;
      debts.push({
        fromUserId,
        toUserId: item.payer.id,
        amount: split.amount,
        splitIds: [split.id],
        dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : null,
      });
    }
  }

  const payments = new Map<string, number>();
  for (const item of items) {
    if (item.type !== "settlement") continue;
    const key = `${item.sender.id}:${item.receiver.id}`;
    payments.set(key, (payments.get(key) || 0) + item.amount);
  }

  for (const debt of debts.sort(compareDueDates)) {
    const key = `${debt.fromUserId}:${debt.toUserId}`;
    const payment = Math.min(debt.amount, payments.get(key) || 0);
    debt.amount -= payment;
    payments.set(key, Math.max(0, (payments.get(key) || 0) - payment));
  }

  return debts.filter((debt) => debt.amount > 0.01);
}

function compareDueDates(a: OutstandingDebt, b: OutstandingDebt) {
  const dueA = a.dueDate
    ? new Date(a.dueDate).getTime()
    : Number.POSITIVE_INFINITY;
  const dueB = b.dueDate
    ? new Date(b.dueDate).getTime()
    : Number.POSITIVE_INFINITY;
  return dueA - dueB;
}

function toSuggestion(debt: OutstandingDebt): SettlementSuggestion {
  return {
    fromUserId: debt.fromUserId,
    toUserId: debt.toUserId,
    amount: Number(debt.amount.toFixed(2)),
    splitIds: debt.splitIds,
    ...(debt.offsetSplitIds?.length
      ? { offsetSplitIds: debt.offsetSplitIds }
      : {}),
    ...(debt.dueDate ? { dueDate: debt.dueDate } : {}),
  };
}
