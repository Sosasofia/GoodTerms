import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Group } from "../lib/types";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";

interface SidebarProps {
  groups: Group[];
  loading?: boolean;
  onOpenModal: (mode: "create" | "join") => void;
  onDemo: () => void;
  demoLoading?: boolean;
  hideDemoButton?: boolean;
}

export function Sidebar({
  groups,
  loading,
  onOpenModal,
  onDemo,
  demoLoading,
  hideDemoButton,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const isGroupOwner = (group: Group) =>
    Boolean(user?.id && group.owner?.clerkId === user.id);

  const handleCopyCode = async (group: Group) => {
    try {
      await navigator.clipboard.writeText(group.code);
      setCopiedGroupId(group.id);
      window.setTimeout(() => setCopiedGroupId((current) => (current === group.id ? null : current)), 1200);
    } catch (error) {
      console.error("Failed to copy group code", error);
    }
  };

  return (
    <div className="w-full h-full bg-[#0F172A] text-white flex flex-col border-r border-slate-800 shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-blue-200">
          GoodTerms
        </h1>
        <p className="text-xs text-slate-400 mt-1">Workspace Edition</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        <div className="text-xs font-bold text-slate-500 mb-2 px-2 uppercase tracking-wider">
          My Groups
        </div>

        {loading ? (
          <div className="space-y-2 px-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-full bg-slate-800/50 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {(groups || []).map((group) => {
              const isActive = pathname.includes(group.id);
              const owner = isGroupOwner(group);

              return (
                <div
                  key={group.id}
                  ref={openMenuId === group.id ? menuRef : undefined}
                  className={`relative flex items-center gap-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Link
                    href={`/groups/${group.id}`}
                    className="flex-1 block px-3 py-2 text-sm font-medium"
                  >
                    # {group.name}
                  </Link>

                  <div className="relative mr-2">
                    <button
                      type="button"
                      aria-label={`More actions for ${group.name}`}
                      onClick={() =>
                        setOpenMenuId((current) => (current === group.id ? null : group.id))
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800/80 text-base font-bold text-slate-200 transition-colors hover:bg-slate-700"
                    >
                      ⋮
                    </button>

                    {openMenuId === group.id && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
                        <button
                          type="button"
                          disabled={!owner}
                          onClick={() => {
                            if (!owner) return;
                            setOpenMenuId(null);
                            router.push(`/groups/${group.id}/settings`);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span>Edit group</span>
                          {!owner && <span className="text-[10px] uppercase tracking-wide text-slate-400">Locked</span>}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyCode(group);
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:bg-slate-800"
                        >
                          <span>Copy group code</span>
                          {copiedGroupId === group.id && <span className="text-[10px] uppercase tracking-wide text-emerald-400">Copied</span>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {groups?.length === 0 && (
              <div className="text-xs text-slate-600 px-2 italic mt-4">
                No groups yet.
              </div>
            )}

            {!hideDemoButton && !user && (
              <button
                onClick={onDemo}
                disabled={demoLoading}
                className="w-full my-6 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded border border-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {demoLoading ? "Loading Demo..." : "Demo"}
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-[#0F172A]">
        <button
          onClick={() => onOpenModal("create")}
          className="w-full mb-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-4 rounded border border-slate-700 transition-colors"
        >
          + Create Group
        </button>

        <button
          onClick={() => onOpenModal("join")}
          className="w-full mb-6 bg-transparent hover:bg-slate-800 text-slate-400 text-xs font-bold py-2 px-4 rounded border border-slate-700 transition-colors"
        >
          → Join via Code
        </button>

        <div className="pt-4 border-t border-slate-800">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 rounded transition-colors shadow-md">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="shrink-0">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-8 h-8 border-2 border-slate-600",
                    },
                  }}
                />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-bold text-slate-200 truncate">
                  {user?.firstName || "User"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>
          </SignedIn>
        </div>
      </div>
    </div>
  );
}
