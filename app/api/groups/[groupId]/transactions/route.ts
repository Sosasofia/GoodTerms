import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";

async function getGroupId(params: any) {
  const p = await Promise.resolve(params);
  return p.groupId || p.id;
}

export async function GET(
  req: Request,
  { params }: { params: { groupId: string } },
) {
  const { userId } = await auth();
  const guestId = req.headers.get("x-guest-id");

  if (!userId && !guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = await getGroupId(params);

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

export async function POST(
  req: Request,
  { params }: { params: { groupId: string } },
) {
  const { userId } = await auth();
  const guestId = req.headers.get("x-guest-id");

  if (!userId && !guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = await getGroupId(params);

  try {
    const body = await req.json();
    const { description, amount, payerId, splits } = body;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        description,
        amount: parseFloat(amount),
        type: "expense",
        date: new Date(),
        group: { connect: { id: groupId } },
        payer: { connect: { id: payerId } },
        splits: {
          create: splits.map((s: any) => ({
            amount: parseFloat(s.amount),
            debtor: { connect: { id: s.debtorId } },
            isPaid: false,
          })),
        },
      },
      include: {
        splits: true,
        payer: true,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("POST Transaction Error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
