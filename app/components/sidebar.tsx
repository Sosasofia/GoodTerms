import { UserButton } from "@clerk/nextjs";

type Props = {
    groups: any[];
    activeGroupId: string;
    onSelectGroup: (id: string) => void;
    onOpenModal: (mode: "create" | "join") => void;
};

export function Sidebar({ groups, activeGroupId, onSelectGroup, onOpenModal }: Props) {
    return (
        <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col hidden md:flex">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-blue-400">GoodTerms</h1>
                <p className="text-xs text-slate-400">Workspace Edition</p>
            </div>

            <div className="flex-1 space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    My Groups
                </h3>
                {groups.map((g) => (
                    <button
                        key={g.id}
                        onClick={() => onSelectGroup(g.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition ${activeGroupId === g.id
                            ? "bg-blue-600 text-white shadow-lg"
                            : "hover:bg-slate-800 text-slate-300"
                            }`}
                    >
                        <div className="font-bold">{g.name}</div>
                        <div className="text-[10px] opacity-70">Code: {g.code}</div>
                    </button>
                ))}
            </div>

            <div className="mt-8 space-y-2">
                <button
                    onClick={() => onOpenModal("create")}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 border border-slate-700"
                >
                    + Create Group
                </button>
                <button
                    onClick={() => onOpenModal("join")}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 border border-slate-700"
                >
                    ➜ Join via Code
                </button>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800">
                <UserButton showName />
            </div>
        </aside>
    )
}
