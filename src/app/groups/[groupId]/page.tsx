"use client";

import { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import { getGroupTransactions } from "@/lib/api";
import { Dashboard, DashboardSkeleton } from "@/components/dashboard";
import { useGroups } from "@/hooks/use-groups";
import { getGroupViewerId } from "@/lib/identity";
import { Transaction } from "@/lib/types";

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const { user } = useUser();
  const { groups, loading: groupsLoading } = useGroups();
  
  const activeGroup = groups.find((g) => g.id === groupId);
  const viewerId = getGroupViewerId(activeGroup, user?.id);

  const [items, setItems] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const refreshTransactions = () => {
    setIsLoading(true);
    getGroupTransactions(groupId)
      .then(setItems)
      .finally(() => setIsLoading(false));
  }

  return (
    <div className="p-4 md:p-8">
      <Dashboard
        group={activeGroup}
        items={items}
        viewerId={viewerId}
        onUpdate={refreshTransactions}
      />
    </div>
  );
}
