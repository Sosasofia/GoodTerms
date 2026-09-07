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
  params: Promise<{ groupId: string }>;
};

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

    const expenses = await prisma.expense.findMany({
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

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
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
    const { description, amount, payerId, splits, note, dueDate } = body;

    const parsedAmount = Number(amount);
    const parsedDueDate = normalizeDueDate(dueDate);
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

    const expense = await prisma.expense.create({
      data: {
        description: description.trim(),
        amount: parsedAmount,
        note,
        dueDate: parsedDueDate,
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
    return NextResponse.json(expense);
  } catch (error: any) {
    console.error("Expense Error:", error.message);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error.message, "Failed to create expense"),
      },
      { status: 400 },
    );
  }
}
