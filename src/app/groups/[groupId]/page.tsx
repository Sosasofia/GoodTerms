"use client";

import { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import { getGroupTransactions } from "@/lib/api";
import { Dashboard, DashboardSkeleton } from "@/components/dashboard";
import { useGroups } from "@/hooks/use-groups";
import { getOrCreateGuestId } from "@/lib/identity";

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const { user } = useUser();
  const { groups, loading: groupsLoading } = useGroups();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeGroup = groups.find((g) => g.id === groupId);

  const dbUser = activeGroup?.members.find((m) => {
    if (user?.id && m.clerkId === user.id) return true;

    const guestId = getOrCreateGuestId();

    return guestId && m.id === guestId;
  });

  const viewerId = dbUser?.id || "";

  useEffect(() => {
    if (groupId) {
      getGroupTransactions(groupId)
        .then(setItems)
        .finally(() => setIsLoading(false));
    }
  }, [groupId]);

  if (groupsLoading || (isLoading && items.length === 0)) {
    return (
      <div className="p-4 md:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!activeGroup) return null;

  return (
    <div className="p-4 md:p-8">
      <Dashboard
        group={activeGroup}
        items={items}
        viewerId={viewerId}
        onUpdate={() => {
          setIsLoading(true);
          getGroupTransactions(groupId)
            .then(setItems)
            .finally(() => setIsLoading(false));
        }}
      />
    </div>
  );
}
