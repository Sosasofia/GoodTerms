import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
  });

  if (dbUser) {
    dbUser = await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        name: user.firstName || user.username || "Unknown",
        email: user.emailAddresses[0]?.emailAddress,
      },
    });
  } else {
    dbUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        name: user.firstName || user.username || "Unknown",
        email: user.emailAddresses[0]?.emailAddress,
      },
    });
  }

  return NextResponse.json(dbUser);
}
