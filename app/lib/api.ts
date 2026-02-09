import { getOrCreateGuestId } from "./identity";
import { Group } from "./types";

class ApiError extends Error {
  requiresConfirmation?: boolean;
  constructor(message: string, requiresConfirmation?: boolean) {
    super(message);
    this.requiresConfirmation = requiresConfirmation;
  }
}

const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);

  if (!res.ok) {
    let errorMessage = `Error ${res.status}: ${res.statusText}`;
    let requiresConfirmation = false;

    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
      requiresConfirmation = errorData.requiresConfirmation;
    } catch (e) {
      console.error("Non-JSON error response:", e);
    }

    throw new ApiError(errorMessage, requiresConfirmation);
  }

  try {
    return await res.json();
  } catch (e) {
    return null;
  }
};

export const syncUser = () =>
  fetch("/api/auth/sync", { method: "POST", cache: "no-store" });

export const getGroups = async (): Promise<Group[]> => {
  const guestId = getOrCreateGuestId();

  const res = await fetch("/api/groups", {
    cache: "no-store",
    headers: {
      "x-guest-id": guestId || "",
    },
  });

  if (!res.ok) return [];
  return res.json();
};

export const getGroupTransactions = async (groupId: string) => {
  const guestId = getOrCreateGuestId();

  return fetcher(`/api/groups/${groupId}/transactions`, {
    headers: {
      "x-guest-id": guestId,
    },
  });
};

export const createGroup = (name: string, pin?: string) =>
  fetcher("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name, pin }),
  });

export const joinGroup = (data: {
  code: string;
  pin?: string;
  guestName?: string;
  guestId?: string;
  action?: "join" | "claim";
}) =>
  fetcher("/api/groups/join", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const createExpense = async (groupId: string, data: any) => {
  const guestId = getOrCreateGuestId();

  return fetcher(`/api/groups/${groupId}/transactions`, {
    method: "POST",
    headers: {
      "x-guest-id": guestId || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...data,
    }),
  });
};

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
