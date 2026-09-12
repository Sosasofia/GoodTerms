"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
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
  const [name, setName] = useState(group.name);
  const [isArchived, setIsArchived] = useState(Boolean(group.isArchived));
  const [loading, setLoading] = useState(false);

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
    (member) => Boolean(member.userId) && member.userId !== group.ownerId,
  );

  const handleSave = async () => {
    setLoading(true);

    if (!name.trim()) {
      setName(group.name);
      toast.error("Group name cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const updated = await updateGroupSettings(group.id, {
        pin: pin.trim() ? pin.trim() : null,
        name: name.trim(),
        isArchived,
      });

      onUpdated(
        updated ?? {
          ...group,
          pin: pin.trim() ? pin.trim() : null,
          name: name.trim(),
          isArchived,
        },
      );
      toast.success("Group settings saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setMemberActionLoading("leave");

    try {
      await leaveGroup(group.id);
      router.push("/groups");
    } catch (err: any) {
      toast.error(err.message || "Failed to leave group.");
    } finally {
      setMemberActionLoading(null);
      setPendingAction(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setMemberActionLoading(memberId);

    try {
      const updated = await removeGroupMember(group.id, memberId);
      onUpdated(updated ?? group);
      toast.success("Member removed from the group.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member.");
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
      setMemberActionLoading(`transfer:${pendingAction.memberId}`);

      try {
        const updated = await updateGroupSettings(group.id, {
          action: "transferOwner",
          memberId: pendingAction.memberId,
        });

        onUpdated(updated ?? { ...group, ownerId: pendingAction.memberId });
        toast.success("Group manager transferred successfully.");
        setTransferMemberId("");
      } catch (err: any) {
        toast.error(err.message || "Failed to transfer manager.");
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
    setIsAddingMember(true);

    try {
      const updated = await addGroupMember(group.id, newMemberName.trim());
      onUpdated(updated ?? group);
      toast.success("Member added to the group.");
      setNewMemberName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add member.");
    } finally {
      setIsAddingMember(false);
    }
  };

  return {
    state: {
      pin,
      name,
      isArchived,
      loading,
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
      setName,
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
