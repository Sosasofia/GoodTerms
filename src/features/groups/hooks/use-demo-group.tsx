import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { joinGroup, getGroups } from "@/lib/api";
import { getOrCreateGuestId } from "@/lib/identity";

export function useDemoGroup(groups: any[], refreshGroups: () => Promise<void>) {
  const [demoLoading, setDemoLoading] = useState(false);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const isDemoMember = groups.some((g) => g.name === "BALI-2025" || g.code.startsWith("DEMO-"));

  const handleDemo = async () => {
    if (!isLoaded || demoLoading) return;

    setDemoLoading(true);

    try {
      const cloneRes = await fetch("/api/demo/clone", { method: "POST" });

      if (!cloneRes.ok) throw new Error("Failed to generate sandbox");

      const { code: sandboxCode } = await cloneRes.json();

      const demoName = "Demo User";

      if (user) {
        await joinGroup({
          code: sandboxCode,
          memberName: demoName,
          guestName: demoName,
          action: "claim"
        });
      } else {
        const guestId = getOrCreateGuestId();
        localStorage.setItem("guest_name", demoName);

        await joinGroup({
          code: sandboxCode,
          guestName: demoName,
          guestId: guestId,
          memberName: demoName,
          action: "claim",
        });
      }

      await refreshGroups();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const freshGroups = await getGroups();
      const demoGroup = (freshGroups || []).find((g: any) => g.code === sandboxCode);

      if (demoGroup) {
        router.push(`/groups/${demoGroup.id}`);
      }
    } catch (error) {
      toast.error("Failed to load demo data. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return { handleDemo, isDemoMember, demoLoading };
}