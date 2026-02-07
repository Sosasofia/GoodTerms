import { Transaction } from "../lib/types";

export function HistoryList({ items }: { items: Transaction[] }) {
    if (items.length === 0) {
        return <div className="text-center text-slate-400 py-8">No activity yet. Add an expense!</div>;
    }

    return (
        <div className="space-y-4 pb-20">
            <h2 className="text-xl font-bold text-slate-800">History</h2>
            {items.map((item) => (
                <div key={`${item.type}-${item.id}`} className={`p-4 rounded-xl shadow-sm border-l-4 bg-white ${item.type === "expense" ? "border-blue-400" : "border-green-400"}`}>
                    {item.type === "expense" ? (
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold">{item.description}</h3>
                                {item.note && <p className="text-xs text-slate-500 italic">📝 {item.note}</p>}
                                <p className="text-xs text-slate-500">{item.payer.name} paid ${item.amount}</p>
                            </div>
                            <div className="text-right">
                                {item.splits.map((s) => (
                                    <div key={s.id} className={`text-xs ${s.isPaid ? "text-green-600 line-through" : "text-red-500"}`}>
                                        {s.debtor.name} {s.isPaid ? "paid" : "owes"} ${s.amount.toFixed(0)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="bg-green-100 text-green-800 p-1 rounded font-bold">PAID</span>
                            <span>{item.sender.name} paid {item.receiver.name} ${item.amount.toFixed(0)}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
