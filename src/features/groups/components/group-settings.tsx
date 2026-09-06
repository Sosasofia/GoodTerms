"use client";

import { Group } from "@/lib/types";
import { useGroupSettings } from "@/features/groups/hooks/use-group-settings";

interface GroupSettingsProps {
    group: Group;
    isOwner: boolean;
    onUpdated: (group: Group) => void;
}

export function GroupSettings({ group, isOwner, onUpdated }: GroupSettingsProps) {
    const { state, actions } = useGroupSettings(group, onUpdated);

    if (!isOwner) return null;

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
                {/* TODO: Change to toast */}
                {state.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                        {state.error}
                    </div>
                )}

                {state.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                        {state.success}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Group CODE
                        </label>
                        <input
                            type="text"
                            value={state.code}
                            onChange={(e) => actions.setCode(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Group PIN
                        </label>
                        <input
                            type="text"
                            value={state.pin}
                            onChange={(e) => actions.setPin(e.target.value)}
                            placeholder="Leave blank for no PIN"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                        />
                    </div>
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
                        checked={state.isArchived}
                        onChange={(e) => actions.setIsArchived(e.target.checked)}
                        className="h-4 w-4 accent-blue-600"
                    />
                </label>

                <button
                    type="button"
                    onClick={actions.handleSave}
                    disabled={state.loading}
                    className="w-full cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                    {state.loading ? "Saving..." : "Save settings"}
                </button>

                {state.eligibleTransferMembers.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
                                Transfer manager
                            </h4>
                        </div>

                        <div className="space-y-3">
                            <select
                                value={state.transferMemberId}
                                onChange={(event) => actions.setTransferMemberId(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="">Select a member</option>
                                {state.eligibleTransferMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!state.transferMemberId) return;
                                    const target = state.eligibleTransferMembers.find(
                                        (member) => member.id === state.transferMemberId
                                    );
                                    actions.setPendingAction({
                                        type: "transfer",
                                        memberId: state.transferMemberId,
                                        memberName: target?.name,
                                    });
                                }}
                                disabled={!state.transferMemberId || Boolean(state.memberActionLoading)}
                                className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Transfer manager
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4">
                        <h4 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-700">
                            Members
                        </h4>

                        <form onSubmit={actions.handleAddMember} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={state.newMemberName}
                                onChange={(e) => actions.setNewMemberName(e.target.value)}
                                placeholder="Search members..."
                                className="flex-1 bg-transparent border border-slate-300 text-sm text-slate-600 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 rounded-lg px-3 py-2"
                                disabled={state.isAddingMember}
                            />
                            <button
                                type="submit"
                                disabled={state.isAddingMember || !state.newMemberName.trim()}
                                className="rounded bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {state.isAddingMember ? "Adding..." : "Add member"}
                            </button>
                        </form>
                    </div>

                    <div className="space-y-2">
                        {group.members.map((member) => {
                            const isOwnerMember = member.id === group.ownerId;
                            const isRemoving = state.memberActionLoading === member.id;

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
                                                actions.setPendingAction({
                                                    type: "remove",
                                                    memberId: member.id,
                                                    memberName: member.name,
                                                })
                                            }
                                            disabled={Boolean(state.memberActionLoading)}
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

                {state.isCurrentUserMember && !isOwner && (
                    <button
                        type="button"
                        onClick={() => actions.setPendingAction({ type: "leave" })}
                        disabled={Boolean(state.memberActionLoading)}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {state.memberActionLoading === "leave" ? "Leaving group..." : "Leave group"}
                    </button>
                )}
            </div>

            {state.pendingAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-center text-3xl">⚠️</div>
                        <h3 className="text-center text-lg font-bold text-slate-800">
                            {state.pendingAction.type === "leave"
                                ? "Leave group?"
                                : state.pendingAction.type === "transfer"
                                    ? "Transfer manager?"
                                    : "Remove member?"}
                        </h3>
                        <p className="mt-2 text-center text-sm text-slate-600">
                            {state.pendingAction.type === "leave"
                                ? "You will no longer have access to this group."
                                : state.pendingAction.type === "transfer"
                                    ? `This will transfer group management to ${state.pendingAction.memberName ?? "the selected member"}.`
                                    : `This will remove ${state.pendingAction.memberName ?? "this member"} from the group.`}
                        </p>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => actions.setPendingAction(null)}
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={actions.confirmPendingAction}
                                disabled={Boolean(state.memberActionLoading)}
                                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-red-300 ${state.pendingAction.type === "transfer"
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "bg-red-600 hover:bg-red-700"
                                    }`}
                            >
                                {state.pendingAction.type === "leave"
                                    ? "Leave"
                                    : state.pendingAction.type === "transfer"
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