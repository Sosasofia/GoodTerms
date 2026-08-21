import { Group } from "../lib/types";
import { LoadingSpinner } from "./loading-spinner";
import { useExpenseForm } from "@/hooks/use-expense-form";

interface ExpenseFormProps {
  group: Group;
  onSuccess: () => void;
}

export function ExpenseForm({ group, onSuccess }: ExpenseFormProps) {
  const {
    desc, setDesc,
    amount, setAmount,
    note, setNote,
    payerId, setPayerId,
    involved, toggleUser,
    isLoading,
    errorMessage,
    handleSubmit
  } = useExpenseForm(group, onSuccess);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
      <form onSubmit={handleSubmit} className="space-y-4">

        {errorMessage && (
          <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

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
        <button disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg cursor-pointer">
          {isLoading ? <LoadingSpinner className="mx-auto" /> : "Save Expense"}
        </button>
      </form>
    </div>
  );
}
