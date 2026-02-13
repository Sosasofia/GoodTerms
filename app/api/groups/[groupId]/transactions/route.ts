import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  const guestId = req.headers.get("x-guest-id");

  if (!userId && !guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;

  try {
    const membership = await prisma.group.findFirst({
      where: {
        id: groupId,
        members: {
          some: {
            OR: [
              ...(userId ? [{ clerkId: userId }] : []),
              ...(guestId ? [{ guestId: guestId }] : []),
            ],
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Group not found or access denied" },
        { status: 404 },
      );
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
    console.error("GET Transactions Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const { description, amount, payerId, splits } = body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
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

    const splitData = splits.map((split: any) => {
      const debtorId = split.debtorId || split.id;

      if (!debtorId) {
        throw new Error(`Missing User ID for split amount: ${split.amount}`);
      }

      return {
        amount: parseFloat(split.amount),
        debtor: { connect: { id: debtorId } },
        isPaid: false,
      };
    });

    const transaction = await prisma.transaction.create({
      data: {
        description,
        amount: parsedAmount,
        type: "expense",
        date: new Date(),
        group: { connect: { id: groupId } },
        payer: { connect: { id: payerId } },
        splits: {
          create: splitData,
        },
      },
      include: {
        splits: true,
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
