import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  const body = await req.json();
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const requestedMemberName =
    typeof body.memberName === "string"
      ? body.memberName.trim()
      : typeof body.guestName === "string"
        ? body.guestName.trim()
        : "";
  const guestId =
    typeof body.guestId === "string"
      ? body.guestId
      : req.headers.get("x-guest-id") || "";

  if (!code) {
    return NextResponse.json({ error: "Group code is required." }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { code },
    include: { owner: true, members: { include: { user: true } } },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  if (group.pin && group.pin !== pin) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 403 });
  }

  if (!userId && (!guestId || !requestedMemberName)) {
    return NextResponse.json(
      { error: "Member name is required to join this group." },
      { status: 400 },
    );
  }

  const dbUser = userId && clerkUser
    ? await prisma.user.upsert({
        where: { clerkId: userId },
        create: {
          clerkId: userId,
          name: clerkUser.firstName || clerkUser.username || "User",
          email: clerkUser.emailAddresses[0]?.emailAddress,
        },
        update: {
          name: clerkUser.firstName || clerkUser.username || "User",
          email: clerkUser.emailAddresses[0]?.emailAddress,
        },
      })
    : await prisma.user.upsert({
        where: { guestId },
        create: { guestId, name: requestedMemberName },
        update: { name: requestedMemberName },
      });

  const existingMembership = group.members.find(
    (member) => member.userId === dbUser.id,
  );

  if (existingMembership) {
    return NextResponse.json(group);
  }

  const memberName =
    requestedMemberName || clerkUser?.firstName || clerkUser?.username || "";
  const availableMember = group.members.find(
    (member) =>
      !member.userId &&
      member.name.trim().toLowerCase() === memberName.trim().toLowerCase(),
  );

  if (!availableMember) {
    return NextResponse.json(
      {
        error:
          "You are not on this group yet. Ask the group manager to add your name.",
      },
      { status: 403 },
    );
  }

  await prisma.member.update({
    where: { id: availableMember.id },
    data: { userId: dbUser.id },
  });

  const updatedGroup = await prisma.group.findUnique({
    where: { id: group.id },
    include: { owner: true, members: { include: { user: true } } },
  });

  return NextResponse.json(updatedGroup);
}
