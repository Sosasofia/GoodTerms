import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "../../../lib/prisma";
export async function POST(req: Request) {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  const { code, pin, guestName, guestId } = await req.json();

  const group = await prisma.group.findUnique({
    where: { code },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.pin && group.pin !== pin) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  let dbUser;

  if (userId && clerkUser) {
    dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      create: {
        clerkId: userId,
        name: clerkUser.firstName || "User",
        email: clerkUser.emailAddresses[0]?.emailAddress,
      },
      update: {},
    });
  } else if (guestId && guestName) {
    dbUser = await prisma.user.upsert({
      where: { guestId: guestId },
      create: {
        guestId: guestId,
        name: guestName,
      },
      update: {
        name: guestName,
      },
    });
  } else {
    return NextResponse.json(
      { error: "Name required for guests" },
      { status: 400 },
    );
  }

  await prisma.group.update({
    where: { id: group.id },
    data: {
      members: {
        connect: { id: dbUser.id },
      },
    },
  });

  return NextResponse.json(group);
}
