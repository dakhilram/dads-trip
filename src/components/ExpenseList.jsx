import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import EditExpense from "./EditExpense";
import { expensesCollectionPath, formatExpenseDate, formatINR, toCents } from "../lib/trip";

export default function ExpenseList({ expenses, members, isLoading }) {
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  async function deleteExpense(expense) {
    if (!window.confirm(`Delete the ${formatINR(toCents(expense.amount))} expense paid by ${expense.paidBy}?`)) return;

    setError("");
    setDeletingId(expense.id);
    try {
      await deleteDoc(doc(db, ...expensesCollectionPath, expense.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this expense. Please try again.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Expenses</h2>
        <span className="text-sm text-slate-500">Newest first</span>
      </div>

      {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      {isLoading && <p className="mt-3 text-sm text-slate-500">Loading expenses…</p>}
      {!isLoading && expenses.length === 0 && <p className="mt-3 text-sm text-slate-500">No expenses have been added yet.</p>}

      <ul className="mt-3 divide-y divide-slate-100">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex flex-wrap justify-between gap-4 py-4">
            <div>
              <p className="font-semibold text-slate-900">{formatINR(toCents(expense.amount))} <span className="font-normal text-slate-500">paid by</span> {expense.paidBy}</p>
              <p className="mt-1 text-sm text-slate-600">Split with {Array.isArray(expense.splitAmong) && expense.splitAmong.length ? expense.splitAmong.join(", ") : "no one"}</p>
              {expense.notes && <p className="mt-1 text-sm text-slate-500">{expense.notes}</p>}
              <p className="mt-1 text-xs text-slate-400">{formatExpenseDate(expense)}</p>
            </div>
            <div className="flex h-fit gap-3 text-sm font-semibold">
              <button type="button" className="text-blue-700 hover:text-blue-900" onClick={() => setEditing(expense)}>Edit</button>
              <button type="button" className="text-rose-700 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-50" disabled={deletingId === expense.id} onClick={() => deleteExpense(expense)}>
                {deletingId === expense.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && <EditExpense key={editing.id} expense={editing} members={members} onClose={() => setEditing(null)} />}
    </section>
  );
}
