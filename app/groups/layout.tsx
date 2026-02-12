"use client";

import { useState } from "react";
import { Sidebar } from "../components/sidebar";
import { GroupModal } from "../components/group-modal";
import { useGroups } from "../hooks/use-groups";

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { groups, refreshGroups } = useGroups();
  const [modalMode, setModalMode] = useState<"create" | "join" | null>(null);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar groups={groups} onOpenModal={setModalMode} />

      <main className="flex-1 overflow-y-auto h-screen">{children}</main>

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
    </div>
  );
}
