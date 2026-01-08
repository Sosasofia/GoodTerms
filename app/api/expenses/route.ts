export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, payerId, involvedUserIds } = body;

    const splitAmount = parseFloat(amount) / involvedUserIds.length;

    const newExpense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        payerId: parseInt(payerId),
        splits: {
          create: involvedUserIds
            .filter((id: number) => id !== parseInt(payerId))
            .map((id: number) => ({
              debtorId: id,
              amount: splitAmount,
            })),
        },
      },
    });

    return NextResponse.json(newExpense);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating expense" },
      { status: 500 }
    );
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

  return NextResponse.json(expenses);
}
