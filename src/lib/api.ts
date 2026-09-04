import { getOrCreateGuestId } from "./identity";
import type { Expense, Group } from "./types";

export interface ExpensePayload {
  description: string;
  amount: number;
  note?: string;
  dueDate?: string | null;
  payerId: string;
  splits: { debtorId: string; amount: number }[];
}

export interface SettlementPayload {
  groupId: string;
  senderId: string;
  receiverId: string;
  splitId?: string;
  splitIds?: string[];
  offsetSplitIds?: string[];
  amount: number;
}

export interface JoinGroupPayload {
  code: string;
  pin?: string;
  memberName: string;
  action?: "join" | "claim";
}

export interface GroupSettingsPayload {
  pin?: string | null;
  isArchived?: boolean;
  action?: "transferOwner";
  memberId?: string;
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
      } catch {}
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

export const getGroupExpenses = (groupId: string) => {
  return fetcher<Expense[]>(`/api/groups/${groupId}/expenses`);
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

export const updateGroupSettings = (
  groupId: string,
  data: GroupSettingsPayload,
) =>
  fetcher<Group>(`/api/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const leaveGroup = (groupId: string) =>
  fetcher<Group>(`/api/groups/${groupId}`, {
    method: "DELETE",
    body: JSON.stringify({ action: "leave" }),
  });

export const removeGroupMember = (groupId: string, memberId: string) =>
  fetcher<Group>(`/api/groups/${groupId}`, {
    method: "DELETE",
    body: JSON.stringify({ action: "removeMember", memberId }),
  });

export const createExpense = (groupId: string, data: ExpensePayload) => {
  return fetcher<Expense>(`/api/groups/${groupId}/expenses`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateExpense = (
  groupId: string,
  transactionId: string,
  data: ExpensePayload,
) => {
  return fetcher<Expense>(`/api/groups/${groupId}/expenses`, {
    method: "PUT",
    body: JSON.stringify({ transactionId, ...data }),
  });
};

export const deleteExpense = (groupId: string, transactionId: string) => {
  return fetcher<{ success: true }>(`/api/groups/${groupId}/expenses`, {
    method: "DELETE",
    body: JSON.stringify({ transactionId }),
  });
};

export const createSettlement = (data: SettlementPayload) =>
  fetcher<Expense>("/api/settlements", {
    method: "POST",
    body: JSON.stringify(data),
  });

export async function addGroupMember(groupId: string, name: string) {
  return fetcher<Group>(`/api/groups/${groupId}/add-member`, {
    method: "POST",
    body: JSON.stringify({ groupId, name }),
  });
}
