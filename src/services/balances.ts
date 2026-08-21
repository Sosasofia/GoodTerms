import { Group, Transaction } from "@/lib/types";

export function calculateBalances(group: Group, items: Transaction[]) {
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
}