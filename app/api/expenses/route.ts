export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, payerId, involvedUserIds, groupId } = body;

    const splitAmount = parseFloat(amount) / involvedUserIds.length;

    const newExpense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        payerId: payerId,
        groupId: groupId,
        splits: {
          create: involvedUserIds
            .filter((id: string) => id !== payerId)
            .map((id: string) => ({
              debtorId: id,
              amount: splitAmount,
            })),
        },
      },
    });
    return NextResponse.json(newExpense);
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) return NextResponse.json([]);

  const expenses = await prisma.expense.findMany({
    where: { groupId: groupId },
    include: {
      payer: true,
      splits: { include: { debtor: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(expenses);
}
