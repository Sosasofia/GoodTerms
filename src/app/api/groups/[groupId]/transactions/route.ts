import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

function normalizeExpenseSplits(splits: any[]) {
  const normalized = splits.map((split) => {
    const debtorId = split.debtorId || split.id;
    const amount = Number(split.amount);

    if (!debtorId || Number.isNaN(amount) || amount <= 0) {
      throw new Error("Each split must include a valid debtor and positive amount.");
    }

    return {
      debtorId,
      amount,
    };
  });

  const total = normalized.reduce((sum, split) => sum + split.amount, 0);
  return { normalized, total };
}

async function authorizeGroupAccess(
  req: NextRequest,
  groupId: string,
  userId?: string | null,
) {
  const guestId = req.headers.get("x-guest-id");

  if (!userId && !guestId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: {
        some: userId ? { clerkId: userId } : { guestId },
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { userId } = await auth();
    const { groupId } = await params;
    const authResult = await authorizeGroupAccess(req, groupId, userId);

    if ("error" in authResult) {
      return authResult.error;
    }

    const transactions = await prisma.transaction.findMany({
      where: { groupId },
      include: {
        payer: true,
        sender: true,
        receiver: true,
        splits: {
          include: { debtor: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { groupId } = await params;
    const { userId } = await auth();
    const authResult = await authorizeGroupAccess(request, groupId, userId);

    if ("error" in authResult) {
      return authResult.error;
    }

    const body = await request.json();
    const { description, amount, payerId, splits, note } = body;

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }
    if (!description || !payerId) {
      return NextResponse.json(
        { error: "Missing description or payer." },
        { status: 400 },
      );
    }

    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json(
        { error: "Splits are required." },
        { status: 400 },
      );
    }

    const validMemberIds = new Set(
      authResult.group.members.map((member) => member.id),
    );

    if (!validMemberIds.has(payerId)) {
      return NextResponse.json({ error: "Payer is not a member of this group." }, { status: 400 });
    }

    const { normalized, total } = normalizeExpenseSplits(splits);
    const missingMembers = normalized.filter(
      (split) => !validMemberIds.has(split.debtorId),
    );

    if (missingMembers.length > 0) {
      return NextResponse.json(
        { error: "One or more split members are not part of this group." },
        { status: 400 },
      );
    }

    if (Math.abs(total - parsedAmount) > 0.01) {
      return NextResponse.json(
        { error: "Split amounts must add up to the total expense amount." },
        { status: 400 },
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        description: description.trim(),
        amount: parsedAmount,
        note,
        type: "expense",
        date: new Date(),
        group: { connect: { id: groupId } },
        payer: { connect: { id: payerId } },
        splits: {
          create: normalized.map((split) => ({
            amount: split.amount,
            debtor: { connect: { id: split.debtorId } },
            isPaid: false,
          })),
        },
      },
      include: {
        splits: { include: { debtor: true } },
        payer: true,
      },
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error("Transaction Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to create transaction" },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { groupId } = await params;
    const { userId } = await auth();
    const authResult = await authorizeGroupAccess(request, groupId, userId);

    if ("error" in authResult) {
      return authResult.error;
    }

    const body = await request.json();
    const {
      transactionId,
      description,
      amount,
      payerId,
      splits,
      note,
    } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction id." }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }
    if (!description || !payerId) {
      return NextResponse.json(
        { error: "Missing description or payer." },
        { status: 400 },
      );
    }
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json(
        { error: "Splits are required." },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, groupId: groupId, type: "expense" },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    const validMemberIds = new Set(
      authResult.group.members.map((member) => member.id),
    );

    if (!validMemberIds.has(payerId)) {
      return NextResponse.json({ error: "Payer is not a member of this group." }, { status: 400 });
    }

    const { normalized, total } = normalizeExpenseSplits(splits);
    const missingMembers = normalized.filter(
      (split) => !validMemberIds.has(split.debtorId),
    );

    if (missingMembers.length > 0) {
      return NextResponse.json(
        { error: "One or more split members are not part of this group." },
        { status: 400 },
      );
    }

    if (Math.abs(total - parsedAmount) > 0.01) {
      return NextResponse.json(
        { error: "Split amounts must add up to the total expense amount." },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.split.deleteMany({
        where: { transactionId: existing.id },
      });

      return tx.transaction.update({
        where: { id: existing.id },
        data: {
          description: description.trim(),
          amount: parsedAmount,
          note,
          payer: { connect: { id: payerId } },
          splits: {
            create: normalized.map((split) => ({
              amount: split.amount,
              debtor: { connect: { id: split.debtorId } },
              isPaid: false,
            })),
          },
        },
        include: {
          payer: true,
          sender: true,
          receiver: true,
          splits: {
            include: { debtor: true },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update transaction error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to update expense" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { groupId } = await params;
    const { userId } = await auth();
    const authResult = await authorizeGroupAccess(request, groupId, userId);

    if ("error" in authResult) {
      return authResult.error;
    }

    let body: { transactionId?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { transactionId } = body;
    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction id." }, { status: 400 });
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, groupId, type: "expense" },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete transaction error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to delete expense" },
      { status: 400 },
    );
  }
}

