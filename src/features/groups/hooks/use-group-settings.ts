"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Group } from "@/lib/types";
import {
  leaveGroup,
  removeGroupMember,
  updateGroupSettings,
  addGroupMember,
} from "@/lib/api";

export interface PendingMemberAction {
  type: "leave" | "remove" | "transfer";
  memberId?: string;
  memberName?: string;
}

export function useGroupSettings(
  group: Group,
  onUpdated: (group: Group) => void,
) {
  const router = useRouter();
  const { user } = useUser();

  const [pin, setPin] = useState(group.pin || "");
  const [isArchived, setIsArchived] = useState(Boolean(group.isArchived));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(
    null,
  );
  const [transferMemberId, setTransferMemberId] = useState<string>("");
  const [pendingAction, setPendingAction] =
    useState<PendingMemberAction | null>(null);

  const [newMemberName, setNewMemberName] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const isCurrentUserMember = Boolean(
    user?.id &&
    group.members.some((member) => member.user?.clerkId === user.id),
  );

  const eligibleTransferMembers = group.members.filter(
    (member) => member.userId !== group.ownerId,
  );

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateGroupSettings(group.id, {
        pin: pin.trim() ? pin.trim() : null,
        isArchived,
      });

      onUpdated(
        updated ?? {
          ...group,
          pin: pin.trim() ? pin.trim() : null,
          isArchived,
        },
      );
      setSuccess("Group settings saved.");
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setError("");
    setSuccess("");
    setMemberActionLoading("leave");

    try {
      await leaveGroup(group.id);
      router.push("/groups");
    } catch (err: any) {
      setError(err.message || "Failed to leave group.");
    } finally {
      setMemberActionLoading(null);
      setPendingAction(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setError("");
    setSuccess("");
    setMemberActionLoading(memberId);

    try {
      const updated = await removeGroupMember(group.id, memberId);
      onUpdated(updated ?? group);
      setSuccess("Member removed from the group.");
    } catch (err: any) {
      setError(err.message || "Failed to remove member.");
    } finally {
      setMemberActionLoading(null);
      setPendingAction(null);
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === "leave") {
      await handleLeaveGroup();
      return;
    }

    if (pendingAction.type === "transfer" && pendingAction.memberId) {
      setError("");
      setSuccess("");
      setMemberActionLoading(`transfer:${pendingAction.memberId}`);

      try {
        const updated = await updateGroupSettings(group.id, {
          action: "transferOwner",
          memberId: pendingAction.memberId,
        });

        onUpdated(updated ?? { ...group, ownerId: pendingAction.memberId });
        setSuccess("Group manager transferred successfully.");
        setTransferMemberId("");
      } catch (err: any) {
        setError(err.message || "Failed to transfer manager.");
      } finally {
        setMemberActionLoading(null);
        setPendingAction(null);
      }
      return;
    }

    if (pendingAction.memberId) {
      await handleRemoveMember(pendingAction.memberId);
    }
  };

  const handleAddMember = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsAddingMember(true);

    try {
      const updated = await addGroupMember(group.id, newMemberName.trim());
      onUpdated(updated ?? group);
      setSuccess("Member added to the group.");
      setNewMemberName("");
    } catch (err: any) {
      setError(err.message || "Failed to add member.");
    } finally {
      setIsAddingMember(false);
    }
  };

  return {
    state: {
      pin,
      isArchived,
      loading,
      error,
      success,
      memberActionLoading,
      transferMemberId,
      pendingAction,
      isCurrentUserMember,
      eligibleTransferMembers,
      newMemberName,
      isAddingMember,
    },
    actions: {
      setPin,
      setIsArchived,
      setTransferMemberId,
      setPendingAction,
      handleSave,
      confirmPendingAction,
      handleAddMember,
      setNewMemberName,
    },
  };
}
