import { v4 as uuidv4 } from "uuid";

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem("guest_id");
  if (!id) {
    id = `guest_${uuidv4()}`;
    localStorage.setItem("guest_id", id);
  }

  return id;
}

export function getGroupViewerId(activeGroup: any, clerkUserId?: string) {
  const dbUser = activeGroup?.members.find(
    (member: any) =>
      member.user?.clerkId === clerkUserId ||
      member.user?.guestId === getOrCreateGuestId(),
  );

  return dbUser?.id || "";
}