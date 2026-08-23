import { getOrCreateGuestId } from "./identity";
import type { Group, Transaction } from "./types";

export interface ExpensePayload {
  description: string;
  amount: number;
  note?: string;
  payerId: string;
  splits: { debtorId: string; amount: number }[];
}

export interface SettlementPayload {
  groupId: string;
  senderId: string;
  receiverId: string;
  splitId?: string;
  amount: number;
}

export interface JoinGroupPayload {
  code: string;
  pin?: string;
  guestName?: string;
  guestId?: string;
  action?: "join" | "claim";
}

export class ApiError extends Error {
  requiresConfirmation?: boolean;

  constructor(message: string, requiresConfirmation?: boolean) {
    super(message);
    this.name = "ApiError";
    this.requiresConfirmation = requiresConfirmation;
  }
}

const fetcher = async <T>(
  url: string,
  options?: RequestInit,
): Promise<T | null> => {
  const headers = new Headers(options?.headers);
  const body = options?.body;

  if (!headers.has("Content-Type") && body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const guestId = getOrCreateGuestId();
  if (guestId) {
    headers.set("x-guest-id", guestId);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = `Error ${res.status}: ${res.statusText}`;
    let requiresConfirmation = false;

    try {
      const errorData = await res.json();

      if (typeof errorData?.error === "string") {
        errorMessage = errorData.error;
      }

      requiresConfirmation = Boolean(errorData?.requiresConfirmation);
    } catch {
      try {
        const errorText = await res.text();

        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Keep the default status-derived message.
      }
    }

    throw new ApiError(errorMessage, requiresConfirmation);
  }

  if (res.status === 204) {
    return null;
  }

  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

export const getGroups = () => {
  return fetcher<Group[]>("/api/groups", {
    method: "GET",
  });
};

export const getGroupTransactions = (groupId: string) => {
  return fetcher<Transaction[]>(`/api/groups/${groupId}/transactions`);
};

export const createGroup = (name: string, pin?: string) =>
  fetcher<Group>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name, pin }),
  });

export const joinGroup = (data: JoinGroupPayload) =>
  fetcher<Group>("/api/groups/join", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const createExpense = (groupId: string, data: ExpensePayload) => {
  return fetcher<Transaction>(`/api/groups/${groupId}/transactions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const createSettlement = (data: SettlementPayload) =>
  fetcher<Transaction>("/api/settlements", {
    method: "POST",
    body: JSON.stringify(data),
  });
