export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, senderId, receiverId, splitId, groupId } = body;

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const settlement = await prisma.transaction.create({
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

    if (splitId) {
      await prisma.split.update({
        where: { id: splitId },
        data: { isPaid: true },
      });
    }

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
    const transactions = await prisma.transaction.findMany({
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

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
