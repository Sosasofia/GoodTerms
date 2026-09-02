import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { joinGroup, getGroups } from "@/lib/api";
import { getOrCreateGuestId } from "@/lib/identity";

export function useDemoGroup(groups: any[], refreshGroups: () => Promise<void>) {
  const [demoLoading, setDemoLoading] = useState(false);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const isDemoMember = groups.some((g) => g.code === "BALI-2025");

  const handleDemo = async () => {
    if (!isLoaded || demoLoading) return;

    setDemoLoading(true);

    try {
      if (user) {
        try {
          await joinGroup({ code: "BALI-2025", memberName: user.firstName || "Demo User" });
        } catch (error: any) {
          if (error.message?.includes("Group not found")) {
            throw error;
          }
        }
      } else {
        const guestId = getOrCreateGuestId();
        const memberName = localStorage.getItem("guest_name") || "Demo User";
        localStorage.setItem("guest_name", memberName);

        try {
          await joinGroup(
            {
              code: "BALI-2025",
              //guestId: getOrCreateGuestId(),
              memberName,
              action: "claim",
            },
          );
        } catch (error: any) { }
      }

      await refreshGroups();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const freshGroups = await getGroups();
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