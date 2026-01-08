export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, senderId, receiverId, splitId } = body;

    const settlement = await prisma.settlement.create({
      data: {
        amount: parseFloat(amount),
        senderId: parseInt(senderId),
        receiverId: parseInt(receiverId),
      },
    });

    if (splitId) {
      await prisma.split.update({
        where: { id: parseInt(splitId) },
        data: { isPaid: true },
      });
    }

    return NextResponse.json(settlement);
  } catch (error) {
    return NextResponse.json({ error: "Failed to settle" }, { status: 500 });
  }
}

export async function GET() {
  const expenses = await prisma.expense.findMany({
    include: {
      payer: true,
      splits: { include: { debtor: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const settlements = await prisma.settlement.findMany({
    include: {
      sender: true,
      receiver: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const combined = [
    ...expenses.map((e) => ({ ...e, type: "expense" })),
    ...settlements.map((s) => ({ ...s, type: "settlement" })),
  ];

  combined.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(combined);
}
