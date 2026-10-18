import { useMemo, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import EditExpense from "./EditExpense";
import {
  expensesCollectionPath,
  settlementsCollectionPath,
  formatExpenseDate,
  formatINR,
  getExpenseAmountPaise,
  getExpenseDate,
  getExpensePersonIds,
  isRecordedSettlement,
  resolvePersonId,
} from "../lib/trip";

export default function ExpenseList({ expenses, settlements = [], people }) {
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const peopleById = useMemo(() => Object.fromEntries(people.map((person) => [person.id, person])), [people]);

  const transactions = useMemo(() => {
    const expenseRows = expenses.map((expense) => ({ ...expense, __storage: "expenses" }));
    const legacyPaybacks = settlements.map((settlement) => ({ ...settlement, __storage: "settlements", recordType: "settlement" }));
    return [...expenseRows, ...legacyPaybacks].sort(
      (first, second) => (getExpenseDate(second)?.getTime() ?? 0) - (getExpenseDate(first)?.getTime() ?? 0),
    );
  }, [expenses, settlements]);

  async function deleteExpense(expense) {
    const payback = isRecordedSettlement(expense);
    if (!window.confirm(`Delete this ${formatINR(getExpenseAmountPaise(expense))} ${payback ? "payback" : "expense"}?`)) return;
    setError("");
    setDeletingId(`${expense.__storage}-${expense.id}`);
    try {
      const path = expense.__storage === "settlements" ? settlementsCollectionPath : expensesCollectionPath;
      await deleteDoc(doc(db, ...path, expense.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this transaction. Please try again.");
    } finally {
      setDeletingId("");
    }
  }

  function personName(reference) {
    const personId = resolvePersonId(reference, people);
    return peopleById[personId]?.name ?? reference ?? "Unknown person";
  }

  return <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">All expenses</h2>
      <span className="text-sm text-slate-500">Newest first</span>
    </div>

    {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}

    {transactions.length === 0 ? <p className="mt-3 text-sm text-slate-500">No expenses recorded yet.</p> : <ul className="mt-3 divide-y divide-slate-100">
      {transactions.map((expense) => {
        const payback = isRecordedSettlement(expense);
        const participantNames = getExpensePersonIds(expense, people).map((id) => peopleById[id]?.name).filter(Boolean);
        const fromName = personName(expense.fromId ?? expense.paidBy);
        const toName = personName(expense.toId ?? participantNames[0]);
        const deleteKey = `${expense.__storage}-${expense.id}`;

        return <li key={deleteKey} className="flex flex-wrap justify-between gap-4 py-4">
          <div>
            {payback ? <>
              <p className="font-semibold text-slate-900">
                {formatINR(getExpenseAmountPaise(expense))} <span className="font-normal text-slate-500">paid back by</span> {fromName} <span className="font-normal text-slate-500">to</span> {toName}
              </p>
              <p className="mt-1 text-sm text-emerald-700">Payback · not included in Total spent</p>
            </> : <>
              <p className="font-semibold text-slate-900">{formatINR(getExpenseAmountPaise(expense))} <span className="font-normal text-slate-500">paid by</span> {personName(expense.paidBy)}</p>
              <p className="mt-1 text-sm text-slate-600">{expense.splitType ?? "equal"} split with {participantNames.join(", ") || "no one"}</p>
            </>}
            {expense.notes && <p className="mt-1 text-sm text-slate-500">{expense.notes}</p>}
            <p className="mt-1 text-xs text-slate-400">{formatExpenseDate(expense)}</p>
          </div>
          <div className="flex h-fit gap-3 text-sm font-bold">
            <button type="button" className="text-blue-700 hover:text-blue-900" onClick={() => setEditing(expense)}>Edit</button>
            <button type="button" disabled={deletingId === deleteKey} className="text-rose-700 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => deleteExpense(expense)}>
              {deletingId === deleteKey ? "Deleting…" : "Delete"}
            </button>
          </div>
        </li>;
      })}
    </ul>}

    {editing && <EditExpense key={`${editing.__storage}-${editing.id}`} expense={editing} people={people} storagePath={editing.__storage === "settlements" ? settlementsCollectionPath : expensesCollectionPath} onClose={() => setEditing(null)} />}
  </section>;
}
