"use client";

import { use, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteExpense, getGroupExpenses } from "@/lib/api";
import { Dashboard, DashboardSkeleton } from "@/features/dashboard/components/dashboard";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { getGroupViewerId } from "@/lib/identity";
import { shouldRedirectFromGroupRoute } from "@/lib/group-access";
import { Expense } from "@/lib/types";

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();
  const hasRedirected = useRef(false);

  const activeGroup = groups.find((g) => g.id === groupId);
  const viewerId = getGroupViewerId(activeGroup, user?.id);

  const [items, setItems] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expensesError, setExpensesError] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    if (
      !shouldRedirectFromGroupRoute({
        isUserLoaded,
        groupsLoading,
        groupsError,
        hasGroup: Boolean(activeGroup),
      }) ||
      hasRedirected.current
    ) {
      return;
    }

    hasRedirected.current = true;
    toast.error("You don't have access to this group.");
    router.replace("/groups");
  }, [activeGroup, groupsError, groupsLoading, isUserLoaded, router]);

  useEffect(() => {
    if (!groupId || groupsLoading || groupsError || !activeGroup) {
      return;
    }

    getGroupExpenses(groupId)
      .then((data) => {
        setItems(data || []);
        setExpensesError(false);
      })
      .catch(() => {
        setExpensesError(true);
        toast.error("Unable to load this group's expenses.");
      })
      .finally(() => setIsLoading(false));
  }, [activeGroup, groupId, groupsError, groupsLoading]);

  if (groupsError) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm font-medium text-red-600">
          Unable to load your groups. Please try again.
        </p>
      </div>
    );
  }

  if (groupsLoading || (isLoading && items.length === 0)) {
    return (
      <div className="p-4 md:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!activeGroup) return null;

  if (expensesError) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm font-medium text-red-600">
          Unable to load this group&apos;s expenses. Please try again.
        </p>
      </div>
    );
  }

  const refreshExpenses = () => {
    setEditingExpense(null);
    setIsLoading(true);
    getGroupExpenses(groupId)
      .then((data) => {
        setItems(data || []);
        setExpensesError(false);
      })
      .catch(() => {
        setExpensesError(true);
        toast.error("Unable to load this group's expenses.");
      })
      .finally(() => setIsLoading(false));
  };

  const handleEditExpense = (item: Expense) => {
    if (item.type === "expense") {
      setEditingExpense(item);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    const selectedExpense = items.find(
      (item) => item.type === "expense" && String(item.id) === String(expenseId),
    );

    if (!selectedExpense) return;
    setDeletingExpenseId(String(expenseId));
  };

  const confirmDeleteExpense = async () => {
    if (!deletingExpenseId) return;

    try {
      await deleteExpense(groupId, deletingExpenseId);
      setDeletingExpenseId(null);
      refreshExpenses();
      toast.success("Expense deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete expense.");
      setDeletingExpenseId(null);
    }
  };

  const deletingExpense = items.find(
    (item) => item.type === "expense" && String(item.id) === String(deletingExpenseId),
  );

  const deletingExpenseData =
    deletingExpense && deletingExpense.type === "expense" ? deletingExpense : null;

  return (
    <div className="p-4 md:p-8">
      <Dashboard
        group={activeGroup}
        items={items}
        viewerId={viewerId}
        onUpdate={refreshExpenses}
        editingExpense={editingExpense}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onCancelEdit={() => setEditingExpense(null)}
      />

      {deletingExpenseData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 text-center border-b border-red-100">
              <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Delete Expense
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to remove this expense?
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-sm">Expense</span>
                <span className="text-xl font-bold text-red-600">
                  {deletingExpenseData.description}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium text-slate-700">
                  ${deletingExpenseData.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex gap-3">
              <button
                onClick={() => setDeletingExpenseId(null)}
                className="flex-1 py-2.5 px-4 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
