import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 14);

    const expiredGroups = await prisma.group.findMany({
      where: {
        code: {
          startsWith: "DEMO-",
          not: "DEMO-BALI-2025",
        },
        createdAt: { lt: thresholdDate },
      },
      select: { id: true },
    });

    const expiredGroupIds = expiredGroups.map((g) => g.id);

    if (expiredGroupIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.split.deleteMany({
          where: { expense: { groupId: { in: expiredGroupIds } } },
        });
        await tx.expense.deleteMany({
          where: { groupId: { in: expiredGroupIds } },
        });
        await tx.member.deleteMany({
          where: { groupId: { in: expiredGroupIds } },
        });
        await tx.group.deleteMany({
          where: { id: { in: expiredGroupIds } },
        });
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: expiredGroupIds.length,
    });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json({ error: "Failed to clean up" }, { status: 500 });
  }
}
