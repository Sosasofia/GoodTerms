import { Expense, Settlement } from "@/lib/types";

type HistoryItem = Expense | Settlement;

interface HistoryListProps {
  items: HistoryItem[];
  onEditExpense?: (item: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
}

export function HistoryList({
  items,
  onEditExpense,
  onDeleteExpense,
}: HistoryListProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        No activity yet. Add an expense!
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => {
    const timestampA = new Date((a as any).date ?? (a as any).createdAt ?? 0).getTime();
    const timestampB = new Date((b as any).date ?? (b as any).createdAt ?? 0).getTime();
    return timestampB - timestampA;
  });

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold text-slate-800">History</h2>
      {sortedItems.map((item) => (
        <div
          key={`${item.type}-${item.id}`}
          className={`p-4 rounded-xl shadow-sm border-l-4 bg-white ${item.type === "expense" ? "border-blue-400" : "border-green-400"
            }`}
        >
          {item.type === "expense" ? (
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <h3 className="font-bold">{item.description}</h3>
                {item.note && (
                  <p className="text-xs text-slate-500 italic">
                    📝 {item.note}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {item.payer.name} paid ${item.amount}
                </p>
                {item.dueDate && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900 shadow-sm">
                    <span aria-hidden="true">📅</span>
                    Due {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  {item.splits
                    .filter((split) => split.debtor.id !== item.payer.id)
                    .map((s: any) => (
                      <div
                        key={s.id}
                        className={`text-xs ${s.isPaid
                          ? "text-green-600 line-through"
                          : "text-red-500"
                          }`}
                      >
                        {s.debtor.name} {s.isPaid ? "paid" : "owes"} $
                        {s.amount.toFixed(0)}
                      </div>
                    ))}
                </div>

                {(onEditExpense || onDeleteExpense) && (
                  <div className="flex gap-2">
                    {onEditExpense && (
                      <button
                        type="button"
                        className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                        onClick={() => onEditExpense(item)}
                      >
                        Edit
                      </button>
                    )}
                    {onDeleteExpense && (
                      <button
                        type="button"
                        className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded hover:bg-red-200"
                        onClick={() => onDeleteExpense(item.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-green-100 text-green-800 p-1 rounded font-bold">
                PAID
              </span>
              <span>
                {item.sender.name} paid {item.receiver.name} ${item.amount.toFixed(0)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}