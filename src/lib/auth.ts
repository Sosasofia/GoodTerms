import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) return null;

  return prisma.user.findUnique({
    where: { clerkId },
  });
}
