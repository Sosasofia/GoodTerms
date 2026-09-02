import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });
    if (user) return user;
  }

  const cookieStore = await cookies();
  const guestId = cookieStore.get("app_guest_session")?.value;

  if (guestId) {
    const user = await prisma.user.findUnique({
      where: { guestId },
    });
    if (user) return user;
  }

  return null;
}
