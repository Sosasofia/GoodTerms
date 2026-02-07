import { Group, Transaction } from "./types";

const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);

  if (!res.ok) {
    let errorMessage = `Error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      console.error("Non-JSON error response:", e);
    }
    throw new Error(errorMessage);
  }

  try {
    return await res.json();
  } catch (e) {
    return null;
  }
};

export const syncUser = () =>
  fetch("/api/auth/sync", { method: "POST", cache: "no-store" });

export const getGroups = (): Promise<Group[]> =>
  fetcher("/api/groups", { cache: "no-store" });

export const getGroupTransactions = (groupId: string): Promise<Transaction[]> =>
  fetcher(`/api/settlements?groupId=${groupId}`, { cache: "no-store" });

export const createGroup = (name: string) =>
  fetcher("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const joinGroup = (code: string) =>
  fetcher("/api/groups/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

export const createExpense = (data: any) =>
  fetcher("/api/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const createSettlement = (data: any) =>
  fetcher("/api/settlements", {
    method: "POST",
    body: JSON.stringify(data),
  });

export async function paySettlement(data: {
  amount: number;
  viewerId: string;
  receiverId: string;
  splitId: string;
  activeGroupId: string;
}) {
  const res = await fetch("/api/settlements", {
    method: "POST",
    body: JSON.stringify({
      amount: data.amount,
      senderId: data.viewerId,
      receiverId: data.receiverId,
      splitId: data.splitId,
      groupId: data.activeGroupId,
    }),
  });
  if (!res.ok) throw new Error("Failed to pay debt");
  return res.json();
}
