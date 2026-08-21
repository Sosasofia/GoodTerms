import { getOrCreateGuestId } from "./identity";

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

class ApiError extends Error {
  requiresConfirmation?: boolean;
  constructor(message: string, requiresConfirmation?: boolean) {
    super(message);
    this.requiresConfirmation = requiresConfirmation;
  }
}

const fetcher = async (
  url: string,
  options?: RequestInit & { token?: string | null },
) => {
  const headers = new Headers(options?.headers);

  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.token) {
    headers.set("Authorization", `Bearer ${options?.token}`);
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

export const getGroups = async (token?: string | null) => {
  return fetcher("/api/groups", {
    method: "GET",
    token,
  });
};

export const getGroupTransactions = async (
  groupId: string,
  token?: string | null,
) => {
  return fetcher(`/api/groups/${groupId}/transactions`, {
    token,
  });
};

export const createGroup = (
  name: string,
  pin?: string,
  token?: string | null,
) =>
  fetcher("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name, pin }),
    token,
  });

export const joinGroup = (
  data: JoinGroupPayload,
  token?: string | null,
) =>
  fetcher("/api/groups/join", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });

export const createExpense = async (
  groupId: string,
  data: ExpensePayload,
  token?: string | null,
) => {
  return fetcher(`/api/groups/${groupId}/transactions`, {
    method: "POST",
    body: JSON.stringify({ ...data }),
    token,
  });
};

export const createSettlement = (
  data: SettlementPayload, 
  token?: string | null
) =>
  fetcher("/api/settlements", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
