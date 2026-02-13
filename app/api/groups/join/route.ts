import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  const { code, pin, guestName, guestId, action } = await req.json();

  const group = await prisma.group.findUnique({
    where: { code },
    include: { members: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.pin && group.pin !== pin) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  if (!userId && guestName) {
    const existingMember = group.members.find(
      (m) => m.name.toLowerCase() === guestName.toLowerCase(),
    );

    if (existingMember) {
      if (existingMember.clerkId) {
        return NextResponse.json(
          { error: "This name belongs to a registered user. Please sign in." },
          { status: 400 },
        );
      }

      if (action !== "claim") {
        return NextResponse.json(
          { error: "Name taken", requiresConfirmation: true },
          { status: 409 },
        );
      }

      await prisma.user.update({
        where: { id: existingMember.id },
        data: { guestId: guestId },
      });

      return NextResponse.json(group);
    }
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
