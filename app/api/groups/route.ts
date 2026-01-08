export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { id: user.id } },
    },
    include: { members: true },
  });

  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  const code =
    name.toUpperCase().replace(/\s+/g, "-") +
    "-" +
    Math.floor(1000 + Math.random() * 9000);

  const group = await prisma.group.create({
    data: {
      name,
      code,
      members: { connect: { id: user.id } },
    },
  });

  return NextResponse.json(group);
}
