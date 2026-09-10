"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { GroupSettings } from "@/features/groups/components/group-settings";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { shouldRedirectFromGroupRoute } from "@/lib/group-access";
import { Group } from "@/lib/types";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { groups, loading, error: groupsError } = useGroups();
  const { user, isLoaded: isUserLoaded } = useUser();

  const [pageGroup, setPageGroup] = useState<Group | null>(null);
  const [pendingLeave, setPendingLeave] = useState(false);
  const hasRedirected = useRef(false);

  const matchedGroup = groups.find((item) => item.id === groupId) ?? null;
  const group =
    matchedGroup && pageGroup?.id === matchedGroup.id ? pageGroup : matchedGroup;
  const isOwner = Boolean(user?.id && group?.owner?.clerkId === user.id);

  useEffect(() => {
    if (
      !shouldRedirectFromGroupRoute({
        isUserLoaded,
        groupsLoading: loading,
        groupsError,
        hasGroup: Boolean(group),
      }) ||
      hasRedirected.current
    ) {
      return;
    }

    hasRedirected.current = true;
    toast.error("You don't have access to this group.");
    router.replace("/groups");
  }, [group, groupsError, isUserLoaded, loading, router]);

  const handleLeaveGroup = async () => {
    if (!group) return;

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to leave group.");
      }

      window.location.href = "/groups";
    } catch (error: any) {
      alert(error.message || "Failed to leave group.");
    }
  };

  if (loading || !groupId) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            <span className="text-sm font-medium">Loading group settings…</span>
          </div>
        </div>
      </div>
    );
  }

  if (groupsError) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-red-900">
            Unable to load group settings
          </h1>
          <p className="mt-2 text-sm text-red-700">
            Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Group settings
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {group.name}
        </h1>

        {isOwner ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm font-medium">
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md font-mono border border-slate-200">
                Code: {" "}
                <span className="font-bold text-slate-900 select-all">
                  {group.code}
                </span>
                <button
                  type="button"
                  className="cursor-pointer ml-2 text-[0.65rem] text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    navigator.clipboard.writeText(group.code);
                  }}
                >
                  Copy
                </button>
              </span>

              {group.pin && (
                <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-md font-mono border border-yellow-200 flex items-center gap-1">
                  PIN: {" "}
                  <span className="font-bold select-all">{group.pin}</span>
                  <button
                    type="button"
                    className="cursor-pointer ml-2 text-[0.65rem] text-yellow-700 hover:text-slate-700"
                    onClick={() => {
                      navigator.clipboard.writeText(group.pin ?? "");
                    }}
                  >
                    Copy
                  </button>
                </span>

              )}

              {group.isArchived && (
                <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-md border border-slate-300 font-bold uppercase tracking-wide text-[10px]">
                  Archived
                </span>
              )}
            </div>
            <GroupSettings
              group={group}
              isOwner={true}
              onUpdated={setPageGroup}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              Only the group manager can edit these settings.
            </p>
            <button
              type="button"
              disabled
              className="mt-4 w-full rounded-lg bg-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed"
            >
              Edit group
            </button>

            <button
              type="button"
              onClick={() => setPendingLeave(true)}
              className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              Leave group
            </button>
          </div>
        )}
      </div>

      {pendingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-3xl">⚠️</div>
            <h3 className="text-center text-lg font-bold text-slate-800">Leave group?</h3>
            <p className="mt-2 text-center text-sm text-slate-600">
              You will no longer have access to this group.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingLeave(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingLeave(false);
                  void handleLeaveGroup();
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
