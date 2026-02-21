import { getOrCreateGuestId } from "./identity";

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
  const guestId = getOrCreateGuestId();

  return fetcher("/api/groups", {
    method: "GET",
    headers: {
      ...(guestId ? { "x-guest-id": guestId } : {}),
    },
    token,
  });
};

export const getGroupTransactions = async (
  groupId: string,
  token?: string | null,
) => {
  const guestId = getOrCreateGuestId();

  return fetcher(`/api/groups/${groupId}/transactions`, {
    headers: {
      "x-guest-id": guestId,
    },
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
  data: {
    code: string;
    pin?: string;
    guestName?: string;
    guestId?: string;
    action?: "join" | "claim";
  },
  token?: string | null,
) =>
  fetcher("/api/groups/join", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });

export const createExpense = async (
  groupId: string,
  data: any,
  token?: string | null,
) => {
  const guestId = getOrCreateGuestId();

  return fetcher(`/api/groups/${groupId}/transactions`, {
    method: "POST",
    headers: {
      "x-guest-id": guestId || "",
    },
    body: JSON.stringify({ ...data }),
    token,
  });
};

export const createSettlement = (data: any, token?: string | null) =>
  fetcher("/api/settlements", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
