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
