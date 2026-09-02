import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  const { code, pin, guestName, guestId, action } = await req.json();

  const group = await prisma.group.findUnique({
    where: { code },
    include: { owner: true, members: { include: { user: true } } },
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
      if (existingMember.user?.clerkId) {
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

  const isAlreadyMember = group.members.some((m) => m.userId === dbUser.id);

  if (!isAlreadyMember) {
    const incomingName =
      userId && clerkUser ? clerkUser.firstName || "User" : guestName;
    const existingMember = group.members.find(
      (m) => m.name.toLowerCase() === incomingName?.toLowerCase(),
    );

    if (existingMember && (!existingMember.userId || action === "claim")) {
      await prisma.member.update({
        where: { id: existingMember.id },
        data: { userId: dbUser.id },
      });
    } else {
      await prisma.member.create({
        data: {
          name: incomingName,
          groupId: group.id,
          userId: dbUser.id,
        },
      });
    }
  }

  const updatedGroup = await prisma.group.findUnique({
    where: { id: group.id },
    include: {
      owner: true,
      members: { include: { user: true } },
    },
  });

  return NextResponse.json(updatedGroup);
}
