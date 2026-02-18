import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const dbUser = await prisma.user.upsert({
    where: { clerkId: user.id },
    update: {
      name: user.firstName || user.username || "Unknown",
      email: user.emailAddresses[0]?.emailAddress,
    },
    create: {
      clerkId: user.id,
      name: user.firstName || user.username || "Unknown",
      email: user.emailAddresses[0]?.emailAddress,
    },
  });

  return NextResponse.json(dbUser);
}
