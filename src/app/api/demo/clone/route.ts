import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST() {
  try {
    const template = await prisma.group.findUnique({
      where: { code: "DEMO-BALI-2025" },
      include: {
        members: true,
        expenses: { include: { splits: true } },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const uniqueSuffix = uuidv4().split("-")[0].toUpperCase();
    const sandboxCode = `DEMO-${uniqueSuffix}`;

    await prisma.$transaction(
      async (tx) => {
        const newGroup = await tx.group.create({
          data: {
            name: template.name,
            code: sandboxCode,
            ownerId: null,
            isDemo: true,
          },
        });

        const memberIdMap = new Map<string, string>();

        for (const tm of template.members) {
          const newMember = await tx.member.create({
            data: {
              name: tm.name,
              groupId: newGroup.id,
              userId: null,
            },
          });
          memberIdMap.set(tm.id, newMember.id);
        }

        await Promise.all(
          template.expenses.map((expense) =>
            tx.expense.create({
              data: {
                description: expense.description,
                amount: expense.amount,
                type: expense.type,
                date: expense.date,
                note: expense.note,
                groupId: newGroup.id,
                payerId: expense.payerId
                  ? memberIdMap.get(expense.payerId)
                  : null,
                senderId: expense.senderId
                  ? memberIdMap.get(expense.senderId)
                  : null,
                receiverId: expense.receiverId
                  ? memberIdMap.get(expense.receiverId)
                  : null,
                splits: {
                  create: expense.splits.map((split) => ({
                    amount: split.amount,
                    isPaid: split.isPaid,
                    debtorId: memberIdMap.get(split.debtorId)!,
                  })),
                },
              },
            }),
          ),
        );
      },
      {
        maxWait: 5000,
        timeout: 20000,
      },
    );

    return NextResponse.json({ code: sandboxCode });
  } catch (error) {
    console.error("Cloning error:", error);
    return NextResponse.json(
      { error: "Failed to clone demo" },
      { status: 500 },
    );
  }
}
