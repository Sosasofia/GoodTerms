"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useGroups } from "./hooks/use-groups";
import { getGroupTransactions } from "./lib/api";
import { Transaction } from "./lib/types";
import { Sidebar } from "./components/sidebar";

import { Dashboard } from "./components/dashboard";
import { GroupModal } from "./components/group-modal";

export default function Home() {
  const { user } = useUser();
  const { groups, refreshGroups } = useGroups();

  const [activeGroupId, setActiveGroupId] = useState<string>("");
  const [items, setItems] = useState<Transaction[]>([]);
  const [modalMode, setModalMode] = useState<"create" | "join" | null>(null);

  useEffect(() => {
    if (activeGroupId) {
      getGroupTransactions(activeGroupId).then(setItems);
    } else if (groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [activeGroupId, groups]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const dbUser = activeGroup?.members.find((m) => m.clerkId === user?.id);
  const viewerId = dbUser?.id || "";

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={setActiveGroupId}
        onOpenModal={setModalMode}
      />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        {modalMode && (
          <GroupModal
            mode={modalMode}
            onClose={() => setModalMode(null)}
            onSuccess={() => {
              setModalMode(null);
              refreshGroups();
            }}
          />
        )}

        {!activeGroup ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-2xl font-bold text-slate-600">Welcome to GoodTerms</h2>
            <p>Select a group to get started.</p>
          </div>
        ) : (
          <Dashboard
            group={activeGroup}
            items={items}
            viewerId={viewerId}
            onUpdate={() => getGroupTransactions(activeGroup.id).then(setItems)}
          />
        )}
      </main>
    </div>
  );
}
