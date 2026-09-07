import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export function normalizeExpenseSplits(splits: any[]) {
  const normalized = splits.map((split) => {
    const debtorId = split.debtorId || split.id;
    const amount = Number(split.amount);

    if (!debtorId || Number.isNaN(amount) || amount <= 0) {
      throw new Error(
        "Each split must include a valid debtor and positive amount.",
      );
    }

    return {
      debtorId,
      amount,
    };
  });

  const total = normalized.reduce((sum, split) => sum + split.amount, 0);
  return { normalized, total };
}

export function normalizeDueDate(dueDate: string | null | undefined) {
  if (!dueDate) {
    return null;
  }

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Due date is invalid.");
  }

  return parsed;
}

export function getSafeErrorMessage(
  message: string | undefined,
  fallback: string,
) {
  const rawMessage = message || fallback;

  if (rawMessage.includes("Unknown argument `dueDate`")) {
    return "Due date support is not available for this database yet. Please sync the schema and try again.";
  }

  if (rawMessage.includes("Invalid `prisma.expense.create()` invocation")) {
    return "Could not create the expense. Please check the entry details and try again.";
  }

  if (rawMessage.includes("Invalid `prisma.expense.update()` invocation")) {
    return "Could not update the expense. Please check the entry details and try again.";
  }

  return rawMessage;
}

export async function authorizeGroupAccess(
  req: NextRequest,
  groupId: string,
  userId?: string | null,
) {
  const guestId = req.headers.get("x-guest-id");

  if (!userId && !guestId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: {
        some: {
          user: userId
            ? { clerkId: userId }
            : { guestId: guestId ?? undefined },
        },
      },
    },
    include: {
      members: true,
    },
  });

  if (!group) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Not a member of this group" },
        { status: 403 },
      ),
    };
  }

  return { group };
}
