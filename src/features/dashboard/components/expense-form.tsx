import { Expense, Group } from "../../../lib/types";
import { LoadingSpinner } from "../../../components/loading-spinner";
import { useExpenseForm } from "@/features/dashboard/hooks/use-expense-form";
import {
  EXPENSE_DESCRIPTION_MIN_LENGTH,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
} from "@/lib/expense-validation";

interface ExpenseFormProps {
  group: Group;
  onSuccess: () => void;
  initialExpense?: Expense | null;
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
    resetForm,
    isLoading,
    errorMessage,
    handleSubmit,
  } = useExpenseForm(group, onSuccess, initialExpense);

  const isEditing = Boolean(initialExpense && initialExpense.type === "expense");
  const handleCancel = () => {
    resetForm();
    onCancel?.();
  };

  return (
    <div
      className={`bg-white p-6 rounded-xl shadow-lg border-t-4 transition-all duration-200 ${isEditing
        ? "border-slate-300 ring-2 ring-slate-100 shadow-sm bg-slate-50"
        : "border-blue-500"
        }`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">
              {isEditing ? "Edit Expense" : "Add Expense"}
            </h3>
            {isEditing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                Updating
                <span className="inline-flex ml-0.5">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:150ms]">.</span>
                  <span className="animate-bounce [animation-delay:300ms]">.</span>
                </span>
              </span>
            )}
          </div>
          {onCancel && (
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
        </div>

        <input
          className="w-full border p-3 rounded-lg"
          placeholder="Description"
          required
          minLength={EXPENSE_DESCRIPTION_MIN_LENGTH}
          maxLength={EXPENSE_DESCRIPTION_MAX_LENGTH}
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
          className={`rounded-xl border p-3 transition-all ${dueDate
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

        {errorMessage && (
          <div className="p-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

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
