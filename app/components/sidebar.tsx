import Link from "next/link";
import { usePathname } from "next/navigation";
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
  onOpenModal: (mode: "create" | "join") => void;
}

export function Sidebar({ groups, onOpenModal }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="w-64 bg-[#0F172A] text-white flex flex-col h-screen border-r border-slate-800 shrink-0">
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

        {(groups || []).map((group) => {
          const isActive = pathname.includes(group.id);
          return (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              # {group.name}
            </Link>
          );
        })}

        {(groups || []).length === 0 && (
          <div className="text-xs text-slate-600 px-2 italic mt-4">
            No groups yet.
          </div>
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
                  afterSignOutUrl="/groups"
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
