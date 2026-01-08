import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await request.json();

  try {
    const group = await prisma.group.update({
      where: { code },
      data: {
        members: { connect: { id: user.id } },
      },
    });
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json(
      { error: "Group not found or already joined" },
      { status: 404 }
    );
  }
}
