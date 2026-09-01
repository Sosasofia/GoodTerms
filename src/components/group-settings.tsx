"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Group } from "@/lib/types";
import { leaveGroup, removeGroupMember, updateGroupSettings } from "@/lib/api";

interface PendingMemberAction {
  type: "leave" | "remove" | "transfer";
  memberId?: string;
  memberName?: string;
}

interface GroupSettingsProps {
  group: Group;
  isOwner: boolean;
  onUpdated: (group: Group) => void;
}

export function GroupSettings({ group, isOwner, onUpdated }: GroupSettingsProps) {
  const router = useRouter();
  const { user } = useUser();
  const [pin, setPin] = useState(group.pin || "");
  const [isArchived, setIsArchived] = useState(Boolean(group.isArchived));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);
  const [transferMemberId, setTransferMemberId] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<PendingMemberAction | null>(null);

  const isCurrentUserMember =
    Boolean(user?.id && group.members.some((member) => member.clerkId === user.id));
  const eligibleTransferMembers = group.members.filter((member) => member.id !== group.ownerId);

  if (!isOwner) return null;

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateGroupSettings(group.id, {
        pin: pin.trim() ? pin.trim() : null,
        isArchived,
      });

      onUpdated(updated ?? { ...group, pin: pin.trim() ? pin.trim() : null, isArchived });
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

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-[15px] font-black uppercase tracking-[0.18em] text-slate-800">
          Group Settings
        </h3>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
          Owner
        </span>
      </div>

      <div className="space-y-5 p-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <div>
          <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Group PIN
          </label>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Leave blank for no PIN"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <div className="text-base font-bold text-slate-800">Archive group</div>
            <div className="mt-1 text-sm text-slate-500">
              Hide it from active work while keeping the records.
            </div>
          </div>
          <input
            type="checkbox"
            checked={isArchived}
            onChange={(e) => setIsArchived(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Saving..." : "Save settings"}
        </button>

        {eligibleTransferMembers.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
                Transfer manager
              </h4>
            </div>

            <div className="space-y-3">
              <select
                value={transferMemberId}
                onChange={(event) => setTransferMemberId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select a member</option>
                {eligibleTransferMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (!transferMemberId) return;
                  const target = eligibleTransferMembers.find((member) => member.id === transferMemberId);
                  setPendingAction({
                    type: "transfer",
                    memberId: transferMemberId,
                    memberName: target?.name,
                  });
                }}
                disabled={!transferMemberId || Boolean(memberActionLoading)}
                className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Transfer manager
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
              Members
            </h4>
            <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              {group.members.length}
            </span>
          </div>

          <div className="space-y-2">
            {group.members.map((member) => {
              const isOwnerMember = member.id === group.ownerId;
              const isRemoving = memberActionLoading === member.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-slate-800">{member.name}</div>
                    {isOwnerMember && (
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                        Manager
                      </div>
                    )}
                  </div>

                  {!isOwnerMember && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({
                          type: "remove",
                          memberId: member.id,
                          memberName: member.name,
                        })
                      }
                      disabled={Boolean(memberActionLoading)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isCurrentUserMember && !isOwner && (
          <button
            type="button"
            onClick={() => setPendingAction({ type: "leave" })}
            disabled={Boolean(memberActionLoading)}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {memberActionLoading === "leave" ? "Leaving group..." : "Leave group"}
          </button>
        )}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-3xl">⚠️</div>
            <h3 className="text-center text-lg font-bold text-slate-800">
              {pendingAction.type === "leave"
                ? "Leave group?"
                : pendingAction.type === "transfer"
                  ? "Transfer manager?"
                  : "Remove member?"}
            </h3>
            <p className="mt-2 text-center text-sm text-slate-600">
              {pendingAction.type === "leave"
                ? "You will no longer have access to this group."
                : pendingAction.type === "transfer"
                  ? `This will transfer group management to ${pendingAction.memberName ?? "the selected member"}.`
                  : `This will remove ${pendingAction.memberName ?? "this member"} from the group.`}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPendingAction}
                disabled={Boolean(memberActionLoading)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-red-300 ${
                  pendingAction.type === "transfer" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {pendingAction.type === "leave"
                  ? "Leave"
                  : pendingAction.type === "transfer"
                    ? "Transfer"
                    : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
