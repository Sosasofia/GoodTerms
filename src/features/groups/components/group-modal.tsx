"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateGroupForm } from "./create-group-form";
import { GroupCreatedView } from "./group-created-view";
import { JoinGroupForm } from "./join-group-form";

interface GroupModalProps {
  mode: "create" | "join";
  onClose: () => void;
  onSuccess: () => void;
}

export function GroupModal({ mode, onClose, onSuccess }: GroupModalProps) {
  const router = useRouter();
  const [createdGroup, setCreatedGroup] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);

  const handleCreated = (group: { id: string; name: string; code: string }) => {
    setCreatedGroup(group);
  };

  const openGroup = (groupId?: string) => {
    onSuccess();
    if (groupId) {
      router.push(`/groups/${groupId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        {!createdGroup && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            aria-label="Close group dialog"
          >
            ✕
          </button>
        )}
        {createdGroup ? (
          <GroupCreatedView
            group={createdGroup}
            onOpen={() => openGroup(createdGroup.id)}
          />
        ) : mode === "create" ? (
          <CreateGroupForm onClose={onClose} onCreated={handleCreated} />
        ) : (
          <JoinGroupForm
            onClose={onClose}
            onJoined={(groupId) => openGroup(groupId)}
          />
        )}
      </div>
    </div>
  );
}
