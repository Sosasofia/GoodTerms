"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"expense" | "settlement">(
    "expense"
  );

  // Forms
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  // Selection
  const [payerId, setPayerId] = useState("");
  const [involved, setInvolved] = useState<number[]>([]);

  // For Settle Up Tab: Who is looking at their debts?
  const [viewerId, setViewerId] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, []);

  // Update defaults when users load
  useEffect(() => {
    if (users.length > 0) {
      if (!payerId) setPayerId(users[0].id.toString());
      if (!viewerId) setViewerId(users[0].id.toString()); // Default viewer is first user
      if (involved.length === 0) setInvolved(users.map((u) => u.id));
    }
  }, [users]);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  async function fetchHistory() {
    const res = await fetch("/api/settlements", { cache: "no-store" });
    if (res.ok) setItems(await res.json());
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc || !amount) return;

    await fetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        description: desc,
        amount: parseFloat(amount),
        payerId: parseInt(payerId),
        involvedUserIds: involved,
      }),
    });
    setDesc("");
    setAmount("");
    fetchHistory();
  }

  async function payDebt(
    splitId: number,
    amount: number,
    receiverId: number,
    description: string
  ) {
    if (!confirm(`Mark "${description}" ($${amount}) as PAID?`)) return;

    await fetch("/api/settlements", {
      method: "POST",
      body: JSON.stringify({
        amount: amount,
        senderId: parseInt(viewerId),
        receiverId: receiverId,
        splitId: splitId,
      }),
    });
    fetchHistory();
  }

  function toggleUser(userId: number) {
    if (involved.includes(userId))
      setInvolved(involved.filter((id) => id !== userId));
    else setInvolved([...involved, userId]);
  }

  const myUnpaidDebts = items
    .filter((item) => item.type === "expense")
    .flatMap((expense) => expense.splits)
    .filter(
      (split: any) => split.debtorId === parseInt(viewerId) && !split.isPaid
    )

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

  // Calculate Balances
  const balances: Record<string, number> = {};
  users.forEach((u) => (balances[u.name] = 0));
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
    <main className="min-h-screen p-4 md:p-8 bg-slate-100 text-slate-900 font-sans">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-extrabold text-blue-600 text-center mb-8">
          GoodTerms
        </h1>

        {/* BALANCES */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {users.map((u) => (
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
                    {users.map((u) => (
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
                    {users.map((u) => (
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
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <h3 className="font-bold text-slate-700 mb-2">Unpaid Debts</h3>
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
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">History</h2>
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className={`p-4 rounded-xl shadow-sm border-l-4 bg-white ${
                item.type === "expense" ? "border-blue-400" : "border-green-400"
              }`}
            >
              {item.type === "expense" ? (
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{item.description}</h3>
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
        </div>
      </div>
    </main>
  );
}
