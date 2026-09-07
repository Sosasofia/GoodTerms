import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeExpenseSplits,
  normalizeDueDate,
  getSafeErrorMessage,
  authorizeGroupAccess,
} from "@/lib/api-utils";

type RouteContext = {
  params: Promise<{ groupId: string; expenseId: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { groupId, expenseId } = await params;

    if (!expenseId) {
      throw new Error("Expense ID is required for updating an expense.");
    }

    const { userId } = await auth();
    const authResult = await authorizeGroupAccess(request, groupId, userId);

    if ("error" in authResult) {
      return authResult.error;
    }

    const body = await request.json();
    const { description, amount, payerId, splits, note, dueDate } = body;

    const parsedDueDate = normalizeDueDate(dueDate);
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

    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, groupId: groupId, type: "expense" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found." },
        { status: 404 },
      );
    }

    const validMemberIds = new Set(
      authResult.group.members.map((member) => member.id),
    );

    if (!validMemberIds.has(payerId)) {
      return NextResponse.json(
        { error: "Payer is not a member of this group." },
        { status: 400 },
      );
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
        where: { expenseId: existing.id },
      });

      return tx.expense.update({
        where: { id: existing.id },
        data: {
          description: description.trim(),
          amount: parsedAmount,
          note,
          dueDate: parsedDueDate,
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
    console.error("Update expense error:", error.message);
    return NextResponse.json(
      { error: getSafeErrorMessage(error.message, "Failed to update expense") },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { groupId, expenseId } = await params;
    const { userId } = await auth();
    const authResult = await authorizeGroupAccess(request, groupId, userId);

    if ("error" in authResult) {
      return authResult.error;
    }

    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, groupId: groupId, type: "expense" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found." },
        { status: 404 },
      );
    }

    await prisma.expense.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete expense error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to delete expense" },
      { status: 400 },
    );
  }
}
