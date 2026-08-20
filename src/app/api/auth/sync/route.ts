import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const guestId = req.headers.get("x-guest-id");

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
  } else if (guestId) {
    const guestUser = await prisma.user.findUnique({
      where: { guestId },
    });

    if (guestUser) {
      dbUser = await prisma.user.update({
        where: { id: guestUser.id },
        data: {
          clerkId: user.id,
          name: user.firstName || user.username || guestUser.name,
          email: user.emailAddresses[0]?.emailAddress || guestUser.email,
        },
      });
    } else {
      dbUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          guestId: guestId,
          name: user.firstName || user.username || "Unknown",
          email: user.emailAddresses[0]?.emailAddress,
        },
      });
    }
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
