"use client";

import { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import { getGroupTransactions } from "../../lib/api";
import { Dashboard } from "../../components/dashboard";
import { useGroups } from "../../hooks/use-groups";
import { useRouter } from "next/navigation";
import { getOrCreateGuestId } from "../../lib/identity";

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params);
    const { user } = useUser();

    const { groups, loading } = useGroups();
    const router = useRouter();
    const [items, setItems] = useState([]);

    const activeGroup = groups.find((g) => g.id === groupId);

    const dbUser = activeGroup?.members.find((m) => {
        if (user?.id && m.clerkId === user.id) return true;

        const guestId = getOrCreateGuestId();
        if (guestId && m.id === guestId) return true;

        return false;
    });

    const viewerId = dbUser?.id || "";

    useEffect(() => {
        if (!loading && !activeGroup) {
            router.push("/groups");
        }
    }, [loading, activeGroup, router]);

    useEffect(() => {
        if (groupId) {
            getGroupTransactions(groupId).then(setItems);
        }
    }, [groupId]);

    if (loading) {
        return <div className="p-8 text-slate-400">Loading group...</div>;
    }

    if (!activeGroup) return null;

    return (
        <div className="p-4 md:p-8">
            <Dashboard
                group={activeGroup}
                items={items}
                viewerId={viewerId}
                onUpdate={() => getGroupTransactions(groupId).then(setItems)}
            />
        </div>
    );
}
