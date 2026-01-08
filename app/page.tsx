"use client";
import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const { user } = useUser();

  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>("");

  // Data for the Active Group
  const [items, setItems] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<"expense" | "settlement">(
    "expense"
  );

  // Forms
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Group Forms
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showGroupModal, setShowGroupModal] = useState<
    "create" | "join" | null
  >(null);

  // Selection
  const [payerId, setPayerId] = useState("");
  const [involved, setInvolved] = useState<string[]>([]);
  const [viewerId, setViewerId] = useState("");

  useEffect(() => {
    async function init() {
      if (user) {
        await fetch("/api/auth/sync", { method: "POST" });
        fetchGroups();
      }
    }
    init();
  }, [user]);

  useEffect(() => {
    if (activeGroupId) {
      fetchGroupData(activeGroupId);
    } else {
      setItems([]);
      setGroupMembers([]);
    }
  }, [activeGroupId]);

  async function fetchGroups() {
    const res = await fetch("/api/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data);
      if (data.length > 0 && !activeGroupId) {
        setActiveGroupId(data[0].id);
      }
    }
  }

  async function fetchGroupData(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setGroupMembers(group.members);
      if (group.members.length > 0) {
        setPayerId(group.members[0].id);
        setViewerId(user?.id || group.members[0].id);
        setInvolved(group.members.map((u: any) => u.id));
      }
    }

    const res = await fetch(`/api/settlements?groupId=${groupId}`, {
      cache: "no-store",
    });
    if (res.ok) setItems(await res.json());
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: newGroupName }),
    });
    if (res.ok) {
      setNewGroupName("");
      setShowGroupModal(null);
      fetchGroups();
    }
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ code: joinCode }),
    });
    if (res.ok) {
      setJoinCode("");
      setShowGroupModal(null);
      fetchGroups();
    } else {
      alert("Invalid Code");
    }
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc || !amount || !activeGroupId) return;

    await fetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        description: desc,
        amount: parseFloat(amount),
        note: note,
        payerId: payerId,
        involvedUserIds: involved,
        groupId: activeGroupId,
      }),
    });
    setDesc("");
    setAmount("");
    setNote("");
    fetchGroupData(activeGroupId);
  }

  async function payDebt(
    splitId: number,
    amount: number,
    receiverId: string,
    description: string
  ) {
    if (!confirm(`Mark "${description}" ($${amount}) as PAID?`)) return;

    await fetch("/api/settlements", {
      method: "POST",
      body: JSON.stringify({
        amount: amount,
        senderId: viewerId,
        receiverId: receiverId,
        splitId: splitId,
        groupId: activeGroupId,
      }),
    });
    fetchGroupData(activeGroupId);
  }

  function toggleUser(userId: string) {
    if (involved.includes(userId))
      setInvolved(involved.filter((id) => id !== userId));
    else setInvolved([...involved, userId]);
  }

  const myUnpaidDebts = items
    .filter((item) => item.type === "expense")
    .flatMap((expense) => expense.splits)
    .filter((split: any) => split.debtorId === viewerId && !split.isPaid)
    .map((split: any) => {
      const parent = items.find(
        (i) => i.id === split.expenseId && i.type === "expense"
      );
      return {
        ...split,
        description: parent?.description,
        receiver: parent?.payer,
      };
    });

  const balances: Record<string, number> = {};
  groupMembers.forEach((u) => (balances[u.name] = 0));
  items.forEach((item) => {
    if (item.type === "expense") {
      item.splits.forEach((split: any) => {
        if (item.payer.name !== split.debtor.name) {
          balances[item.payer.name] += split.amount;
          balances[split.debtor.name] -= split.amount;
        }
      });
    } else {
      balances[item.sender.name] += item.amount;
      balances[item.receiver.name] -= item.amount;
    }
  });

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* SIDEBAR */}
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
              onClick={() => setActiveGroupId(g.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                activeGroupId === g.id
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
            onClick={() => setShowGroupModal("create")}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 border border-slate-700"
          >
            + Create Group
          </button>
          <button
            onClick={() => setShowGroupModal("join")}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 border border-slate-700"
          >
            ➜ Join via Code
          </button>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800">
          <UserButton showName />
        </div>
      </aside>

      {/* MOBILE HEADER (Visible only on mobile) */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white p-4 flex justify-between z-50">
        <h1 className="font-bold">GoodTerms</h1>
        <UserButton />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-14 md:mt-0">
        {/* GROUP MODALS */}
        {showGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-4">
                {showGroupModal === "create"
                  ? "Create New Group"
                  : "Join Group"}
              </h2>
              {showGroupModal === "create" ? (
                <form onSubmit={handleCreateGroup}>
                  <input
                    className="w-full border p-2 rounded mb-4"
                    placeholder="Group Name (e.g. Trip to Brazil)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(null)}
                      className="flex-1 py-2 bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button className="flex-1 py-2 bg-blue-600 text-white rounded font-bold">
                      Create
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoinGroup}>
                  <input
                    className="w-full border p-2 rounded mb-4"
                    placeholder="Enter Code (e.g. TRIP-1234)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(null)}
                      className="flex-1 py-2 bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button className="flex-1 py-2 bg-green-600 text-white rounded font-bold">
                      Join
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!activeGroupId ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-2xl font-bold text-slate-600">
              Welcome to GoodTerms
            </h2>
            <p>Select a group from the sidebar or create one to get started.</p>
            {/* Mobile buttons since sidebar is hidden on mobile */}
            <div className="md:hidden flex flex-col gap-2 mt-8 w-64">
              <button
                onClick={() => setShowGroupModal("create")}
                className="py-3 bg-blue-600 text-white rounded-lg font-bold"
              >
                Create Group
              </button>
              <button
                onClick={() => setShowGroupModal("join")}
                className="py-3 bg-slate-200 text-slate-700 rounded-lg font-bold"
              >
                Join Existing Group
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* GROUP HEADER */}
            <div className="flex justify-between items-end mb-6 border-b pb-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">
                  {groups.find((g) => g.id === activeGroupId)?.name}
                </h2>
                <p className="text-sm text-slate-500">
                  Invite Code:{" "}
                  <span className="font-mono bg-slate-200 px-1 rounded select-all">
                    {groups.find((g) => g.id === activeGroupId)?.code}
                  </span>
                </p>
              </div>
            </div>

            {/* BALANCES */}
            <div className="grid grid-cols-3 gap-2 mb-8">
              {groupMembers.map((u) => (
                <div
                  key={u.id}
                  className={`p-2 rounded-lg text-center border ${
                    balances[u.name] >= 0
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="font-bold text-sm truncate">{u.name}</div>
                  <div
                    className={`font-bold ${
                      balances[u.name] >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {balances[u.name] >= 0 ? "+" : ""}
                    {balances[u.name]?.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>

            {/* TABS */}
            <div className="flex mb-4 bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setActiveTab("expense")}
                className={`flex-1 py-2 rounded font-bold ${
                  activeTab === "expense"
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-500"
                }`}
              >
                Add Expense
              </button>
              <button
                onClick={() => setActiveTab("settlement")}
                className={`flex-1 py-2 rounded font-bold ${
                  activeTab === "settlement"
                    ? "bg-green-100 text-green-700"
                    : "text-slate-500"
                }`}
              >
                Settle Up
              </button>
            </div>

            {/* ACTIVE TAB CONTENT */}
            <div className="mb-8">
              {activeTab === "expense" ? (
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
                  <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <input
                      className="w-full border p-3 rounded-lg"
                      placeholder="Description"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />

                    <input
                      className="w-full border p-3 rounded-lg"
                      placeholder="Note (optional, e.g. Due Date)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />

                    <input
                      className="w-full border p-3 rounded-lg"
                      type="number"
                      placeholder="Amount ($)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        PAID BY
                      </label>
                      <select
                        className="w-full border p-2 rounded"
                        value={payerId}
                        onChange={(e) => setPayerId(e.target.value)}
                      >
                        {groupMembers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        SPLIT AMONGST
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {groupMembers.map((u) => (
                          <label
                            key={u.id}
                            className="flex items-center gap-1 cursor-pointer bg-slate-50 px-2 py-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={involved.includes(u.id)}
                              onChange={() => toggleUser(u.id)}
                            />
                            {u.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">
                      Save Expense
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-500 block mb-1">
                      WHO IS PAYING?
                    </label>
                    <select
                      className="w-full border p-2 rounded bg-green-50 text-green-800 font-bold"
                      value={viewerId}
                      onChange={(e) => setViewerId(e.target.value)}
                    >
                      {groupMembers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <h3 className="font-bold text-slate-700 mb-2">
                    Unpaid Debts
                  </h3>
                  {myUnpaidDebts.length === 0 ? (
                    <p className="text-slate-400 italic">
                      No pending debts for this user.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {myUnpaidDebts.map((debt: any) => (
                        <div
                          key={debt.id}
                          className="flex justify-between items-center border p-3 rounded-lg hover:bg-slate-50"
                        >
                          <div>
                            <div className="font-bold">{debt.description}</div>
                            <div className="text-xs text-slate-500">
                              Owed to {debt.receiver?.name}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              payDebt(
                                debt.id,
                                debt.amount,
                                debt.receiver?.id,
                                debt.description
                              )
                            }
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-bold"
                          >
                            Pay ${debt.amount.toFixed(0)}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* HISTORY LIST */}
            <div className="space-y-4 pb-20">
              <h2 className="text-xl font-bold text-slate-800">History</h2>
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-4 rounded-xl shadow-sm border-l-4 bg-white ${
                    item.type === "expense"
                      ? "border-blue-400"
                      : "border-green-400"
                  }`}
                >
                  {item.type === "expense" ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{item.description}</h3>
                        {item.note && (
                          <p className="text-xs text-slate-500 italic mb-1">
                            📝 {item.note}
                          </p>
                        )}

                        <p className="text-xs text-slate-500">
                          {item.payer.name} paid ${item.amount}
                        </p>
                      </div>
                      <div className="text-right">
                        {item.splits.map((s: any) => (
                          <div
                            key={s.id}
                            className={`text-xs ${
                              s.isPaid
                                ? "text-green-600 line-through"
                                : "text-red-500"
                            }`}
                          >
                            {s.debtor.name} {s.isPaid ? "paid" : "owes"} $
                            {s.amount.toFixed(0)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-green-100 text-green-800 p-1 rounded font-bold">
                        PAID
                      </span>
                      <span>
                        {item.sender.name} paid {item.receiver.name} $
                        {item.amount.toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  No activity yet. Add an expense!
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
