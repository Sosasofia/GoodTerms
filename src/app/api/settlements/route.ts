export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      amount,
      senderId,
      receiverId,
      splitId,
      splitIds,
      offsetSplitIds,
      groupId,
    } = body;

    const value = parseFloat(amount);

    if (isNaN(value) || value <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const requestedSplitIds = Array.isArray(splitIds)
      ? splitIds.filter((id): id is string => typeof id === "string")
      : splitId
        ? [splitId]
        : [];

    const requestedOffsetSplitIds = Array.isArray(offsetSplitIds)
      ? offsetSplitIds.filter((id): id is string => typeof id === "string")
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

        const offsetSplits = requestedOffsetSplitIds.length
          ? await tx.split.findMany({
              where: {
                id: { in: requestedOffsetSplitIds },
                debtorId: receiverId,
                isPaid: false,
                expense: {
                  groupId,
                  payerId: senderId,
                  type: "expense",
                },
              },
            })
          : [];
        const offsetTotal = offsetSplits.reduce(
          (sum, split) => sum + split.amount,
          0,
        );

        if (
          splits.length !== requestedSplitIds.length ||
          offsetSplits.length !== requestedOffsetSplitIds.length ||
          (requestedOffsetSplitIds.length > 0
            ? Math.abs(value - (splitTotal - offsetTotal)) > 0.01
            : value > splitTotal + 0.01)
        ) {
          throw new Error("The selected debt is no longer available.");
        }

        const claimResult = await tx.split.updateMany({
          where: {
            id: { in: requestedSplitIds },
            isPaid: false,
          },
          data: { isPaid: true },
        });

        if (claimResult.count !== requestedSplitIds.length) {
          throw new Error(
            "Conflict: One or more of these splits have already been settled.",
          );
        }

        await tx.split.updateMany({
          where: { id: { in: requestedSplitIds } },
          data: { isPaid: true },
        });

        if (requestedOffsetSplitIds.length > 0) {
          await tx.split.updateMany({
            where: { id: { in: requestedOffsetSplitIds } },
            data: { isPaid: true },
          });
        }
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
    if (
      error.message &&
      error.message.startsWith(
        "Conflict: One or more of these splits have already been settled.",
      )
    ) {
      return NextResponse.json(
        { error: "One or more of these splits have already been settled." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "An error occurred while processing the settlement." },
      { status: 500 },
    );
  }
}
