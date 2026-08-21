import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { joinGroup, getGroups } from "@/lib/api";
import { getOrCreateGuestId } from "@/lib/identity";

export function useDemoGroup(groups: any[], refreshGroups: () => Promise<void>) {
  const [demoLoading, setDemoLoading] = useState(false);
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const isDemoMember = groups.some((g) => g.code === "BALI-2025");

  const handleDemo = async () => {
    if (!isLoaded || demoLoading) return;

    setDemoLoading(true);

    try {
      const token = await getToken();

      if (user) {
        try {
          await joinGroup({ code: "BALI-2025" }, token);
        } catch (error: any) {
          if (error.message?.includes("Group not found")) {
            throw error;
          }
        }
      } else {
        const guestId = getOrCreateGuestId();
        const guestName = localStorage.getItem("guest_name") || "Demo User";
        localStorage.setItem("guest_name", guestName);

        try {
          await joinGroup(
            {
              code: "BALI-2025",
              guestId,
              guestName,
              action: "claim",
            },
            token,
          );
        } catch (error: any) {}
      }

      await refreshGroups();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const freshGroups = await getGroups(token);
      const demoGroup = (freshGroups || []).find(
        (g: any) => g.code === "BALI-2025",
      );
      if (demoGroup) {
        router.push(`/groups/${demoGroup.id}`);
      }
    } catch (error) {
      console.error("Failed to load demo data", error);
    } finally {
      setDemoLoading(false);
    }
  };
  return { handleDemo, isDemoMember, demoLoading };
}