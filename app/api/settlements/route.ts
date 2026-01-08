export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, senderId, receiverId, splitId, groupId } = body;

    const settlement = await prisma.settlement.create({
      data: {
        amount: parseFloat(amount),
        senderId,
        receiverId,
        groupId: groupId,
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
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) return NextResponse.json([]);

  const expenses = await prisma.expense.findMany({
    where: { groupId: groupId },
    include: { payer: true, splits: { include: { debtor: true } } },
    orderBy: { createdAt: "desc" },
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId: groupId },
    include: { sender: true, receiver: true },
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
