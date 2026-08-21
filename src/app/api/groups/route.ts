import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    const guestId = req.headers.get("x-guest-id");

    if (!userId && !guestId) {
      return NextResponse.json([]);
    }

    const memberCondition = userId ? { clerkId: userId } : { guestId: guestId };

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: memberCondition,
        },
      },
      include: {
        members: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, pin } = await req.json();

    const cleanName = name.trim().toUpperCase().replace(/\s+/g, "-");
    const code = `${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`;

    const group = await prisma.group.create({
      data: {
        name,
        code,
        pin: pin || null,
        members: {
          connectOrCreate: {
            where: { clerkId: userId },
            create: {
              clerkId: userId,
              name: user.firstName || "User",
              email: user.emailAddresses[0]?.emailAddress || "",
            },
          },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}
