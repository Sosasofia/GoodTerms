import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { owner: true, members: { include: { user: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error: any) {
    console.error("Get group error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load group" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { userId } = await auth();
    const { groupId } = await params;
    const body = await req.json();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { owner: true, members: { include: { user: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!userId || group.owner?.clerkId !== userId) {
      return NextResponse.json(
        { error: "Only the group owner can change settings." },
        { status: 403 },
      );
    }

    if (body.action === "transferOwner") {
      const targetMemberId = body.memberId;

      if (!targetMemberId) {
        return NextResponse.json(
          { error: "A member must be selected to transfer ownership." },
          { status: 400 },
        );
      }

      const targetMember = group.members.find(
        (member) => member.id === targetMemberId,
      );
      if (!targetMember) {
        return NextResponse.json(
          { error: "Selected member is not in this group." },
          { status: 404 },
        );
      }

      if (!targetMember.userId) {
        return NextResponse.json(
          {
            error:
              "Cannot transfer ownership to a placeholder member. They must join the app first.",
          },
          { status: 400 },
        );
      }

      const updated = await prisma.group.update({
        where: { id: groupId },
        data: {
          ownerId: targetMember.userId,
        },
        include: { owner: true, members: { include: { user: true } } },
      });

      return NextResponse.json(updated);
    }

    const nextPin =
      body.pin === undefined
        ? undefined
        : body.pin === null || String(body.pin).trim() === ""
          ? null
          : String(body.pin).trim();

    const newName =
      body.name === undefined ? undefined : String(body.name).trim();

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(nextPin !== undefined ? { pin: nextPin } : {}),
        ...(body.isArchived !== undefined
          ? { isArchived: Boolean(body.isArchived) }
          : {}),
        ...(newName !== undefined && newName !== "" ? { name: newName } : {}),
      },
      include: { owner: true, members: { include: { user: true } } },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update group settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update group settings" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { userId } = await auth();
    const guestId = req.headers.get("x-guest-id");
    const { groupId } = await params;
    const body = await req.json().catch(() => ({}));

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { owner: true, members: { include: { user: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (body.action === "leave") {
      const member =
        (userId && group.members.find((m) => m.user?.clerkId === userId)) ||
        (guestId && group.members.find((m) => m.user?.guestId === guestId));

      if (!member) {
        return NextResponse.json(
          { error: "You are not a member of this group." },
          { status: 403 },
        );
      }

      if (group.ownerId === member.userId) {
        return NextResponse.json(
          {
            error:
              "The group owner cannot leave the group. Transfer ownership or archive it first.",
          },
          { status: 400 },
        );
      }

      const updated = await prisma.group.update({
        where: { id: groupId },
        data: {
          members: {
            delete: { id: member.id },
          },
        },
        include: { owner: true, members: { include: { user: true } } },
      });

      return NextResponse.json(updated);
    }

    if (body.action === "removeMember") {
      if (!userId || group.owner?.clerkId !== userId) {
        return NextResponse.json(
          { error: "Only the group owner can remove members." },
          { status: 403 },
        );
      }

      const memberId = body.memberId;
      if (!memberId) {
        return NextResponse.json(
          { error: "A member ID is required." },
          { status: 400 },
        );
      }

      const targetMember = group.members.find((m) => m.id === memberId);
      if (!targetMember) {
        return NextResponse.json(
          { error: "Member not found." },
          { status: 404 },
        );
      }

      if (targetMember.userId === group.ownerId) {
        return NextResponse.json(
          { error: "The group owner cannot be removed." },
          { status: 400 },
        );
      }

      const updated = await prisma.group.update({
        where: { id: groupId },
        data: {
          members: {
            delete: { id: targetMember.id },
          },
        },
        include: { owner: true, members: { include: { user: true } } },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: "Unsupported group membership action." },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Group membership update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update group membership" },
      { status: 500 },
    );
  }
}
