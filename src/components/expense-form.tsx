import { Group, Transaction } from "../lib/types";
import { LoadingSpinner } from "./loading-spinner";
import { useExpenseForm } from "@/hooks/use-expense-form";

interface ExpenseFormProps {
  group: Group;
  onSuccess: () => void;
  initialExpense?: Transaction | null;
  onCancel?: () => void;
}

export function ExpenseForm({
  group,
  onSuccess,
  initialExpense,
  onCancel,
}: ExpenseFormProps) {
  const {
    desc,
    setDesc,
    amount,
    setAmount,
    note,
    setNote,
    dueDate,
    setDueDate,
    payerId,
    setPayerId,
    involved,
    toggleUser,
    isLoading,
    errorMessage,
    handleSubmit,
  } = useExpenseForm(group, onSuccess, initialExpense);

  const isEditing = Boolean(initialExpense && initialExpense.type === "expense");

  return (
    <div
      className={`bg-white p-6 rounded-xl shadow-lg border-t-4 transition-all duration-200 ${
        isEditing
          ? "border-blue-500 ring-2 ring-blue-200 shadow-blue-100"
          : "border-blue-500"
      }`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">
              {isEditing ? "Edit Expense" : "Add Expense"}
            </h3>
            {isEditing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                ✏️ Updating
              </span>
            )}
          </div>
          {onCancel && (
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>

        <input
          className="w-full border p-3 rounded-lg"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-lg"
          placeholder="Note (optional)"
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

        <div
          className={`rounded-xl border p-3 transition-all ${
            dueDate
              ? "border-amber-300 bg-amber-50 shadow-sm"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Due date (optional)
          </label>
          <input
            type="date"
            className="w-full border border-slate-200 bg-white p-3 rounded-lg text-slate-700"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {dueDate && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
              Scheduled for {new Date(`${dueDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500">PAID BY</label>
          <select
            className="w-full border p-2 rounded"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
          >
            {group.members.map((u) => (
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
            {group.members.map((u) => (
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

        <button
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg cursor-pointer"
        >
          {isLoading ? (
            <LoadingSpinner className="mx-auto" />
          ) : isEditing ? (
            "Update Expense"
          ) : (
            "Save Expense"
          )}
        </button>
      </form>
    </div>
  );
}
