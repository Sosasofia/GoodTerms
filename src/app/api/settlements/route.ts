export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, senderId, receiverId, splitId, splitIds, groupId } = body;

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const requestedSplitIds = Array.isArray(splitIds)
      ? splitIds.filter((id): id is string => typeof id === "string")
      : splitId
        ? [splitId]
        : [];

    const settlement = await prisma.$transaction(async (tx) => {
      if (requestedSplitIds.length > 0) {
        const splits = await tx.split.findMany({
          where: {
            id: { in: requestedSplitIds },
            debtorId: senderId,
            isPaid: false,
            expense: {
              groupId,
              payerId: receiverId,
              type: "expense",
            },
          },
        });

        const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);
        if (
          splits.length !== requestedSplitIds.length ||
          Math.abs(splitTotal - value) > 0.01
        ) {
          throw new Error("The selected debt is no longer available.");
        }

        await tx.split.updateMany({
          where: { id: { in: requestedSplitIds } },
          data: { isPaid: true },
        });
      } else {
        const unpaidSplits = await tx.split.findMany({
          where: {
            debtorId: senderId,
            isPaid: false,
            expense: {
              payerId: receiverId,
              groupId,
              type: "expense",
            },
          },
          orderBy: { expense: { date: "asc" } },
        });

        let remainingAmount = value;
        const splitIdsToPay: string[] = [];

        for (const split of unpaidSplits) {
          if (remainingAmount >= split.amount) {
            splitIdsToPay.push(split.id);
            remainingAmount -= split.amount;
          } else {
            break;
          }
        }

        if (splitIdsToPay.length > 0) {
          await tx.split.updateMany({
            where: { id: { in: splitIdsToPay } },
            data: { isPaid: true },
          });
        }
      }

      return tx.expense.create({
        data: {
          amount: value,
          description: "Payment",
          type: "settlement",
          date: new Date(),
          group: { connect: { id: groupId } },
          sender: { connect: { id: senderId } },
          receiver: { connect: { id: receiverId } },
        },
        include: {
          sender: true,
          receiver: true,
        },
      });
    });

    return NextResponse.json(settlement);
  } catch (error: any) {
    console.error("Settlement Error:", error);
    return NextResponse.json(
      { error: "Failed to process settlement", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) return NextResponse.json([]);

  try {
    const expenses = await prisma.expense.findMany({
      where: { groupId: groupId },
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
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
