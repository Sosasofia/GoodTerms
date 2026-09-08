import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, name } = await req.json();

    if (!groupId || !name?.trim()) {
      return NextResponse.json(
        { error: "Group ID and member name are required" },
        { status: 400 },
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the group manager can add members" },
        { status: 403 },
      );
    }

    const existingMember = await prisma.member.findFirst({
      where: {
        groupId: groupId,
        name: name.trim(),
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "Member already exists in the group" },
        { status: 400 },
      );
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        members: {
          create: {
            name: name.trim(),
          },
        },
      },
      include: {
        owner: true,
        members: { include: { user: true } },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Add Member Error:", error);
    return NextResponse.json(
      { error: "Failed to add member to the group" },
      { status: 500 },
    );
  }
}
