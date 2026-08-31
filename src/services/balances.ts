import { Group, Transaction } from "@/lib/types";

export interface SettlementSuggestion {
  fromUserId: string;
  toUserId: string;
  amount: number;
  dueDate?: string | null;
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
): SettlementSuggestion[] {
  const entries = new Map<
    string,
    { amount: number; dueDate: string | null }
  >();

  for (const item of items || []) {
    if (item.type !== "expense") continue;
    if (!item.payer || item.payer.id === payerId) continue;

    const pendingDueDate = item.dueDate ? new Date(item.dueDate) : null;

    for (const split of item.splits || []) {
      if (split.debtor.id !== payerId || split.isPaid) continue;

      const current = entries.get(item.payer.id) || { amount: 0, dueDate: null };
      current.amount += split.amount;

      if (
        pendingDueDate &&
        (!current.dueDate || pendingDueDate.getTime() < new Date(current.dueDate).getTime())
      ) {
        current.dueDate = pendingDueDate.toISOString();
      }

      entries.set(item.payer.id, current);
    }
  }

  return [...entries.entries()]
    .map(([receiverId, details]) => ({
      fromUserId: payerId,
      toUserId: receiverId,
      amount: Number(details.amount.toFixed(2)),
      ...(details.dueDate ? { dueDate: details.dueDate } : {}),
    }))
    .sort((a, b) => {
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;

      if (dueA !== dueB) {
        return dueA - dueB;
      }

      return b.amount - a.amount;
    });
}
