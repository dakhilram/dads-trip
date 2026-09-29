import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { expensesCollectionPath, toCents } from "../lib/trip";

export default function EditExpense({ expense, members, onClose }) {
  const [amount, setAmount] = useState(String(expense.amount ?? ""));
  const [paidBy, setPaidBy] = useState(expense.paidBy ?? "");
  const [splitAmong, setSplitAmong] = useState(() => Array.isArray(expense.splitAmong) ? expense.splitAmong : []);
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggleSplit(member) {
    setSplitAmong((current) => current.includes(member) ? current.filter((person) => person !== member) : [...current, member]);
  }

  async function saveChanges(event) {
    event.preventDefault();
    const amountCents = toCents(amount);
    const validSplit = splitAmong.filter((member) => members.includes(member));
    if (amountCents <= 0 || !members.includes(paidBy) || !validSplit.length) {
      setError("Enter a positive amount, choose who paid, and select at least one person to split it with.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await updateDoc(doc(db, ...expensesCollectionPath, expense.id), {
        amount: amountCents / 100,
        paidBy,
        splitAmong: validSplit,
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update this expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-expense-title">
        <div className="flex items-center justify-between gap-4">
          <h2 id="edit-expense-title" className="text-xl font-bold text-slate-900">Edit expense</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Close</button>
        </div>
        <form className="mt-5 space-y-4" onSubmit={saveChanges}>
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
          <label className="block text-sm font-semibold text-slate-700" htmlFor="edit-amount">Amount (₹)
            <input id="edit-amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="edit-paid-by">Paid by
            <select id="edit-paid-by" required value={paidBy} onChange={(event) => setPaidBy(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3">
              <option value="">Choose a member</option>
              {members.map((member) => <option key={member} value={member}>{member}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Split among</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {members.map((member) => <label key={member} className="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={splitAmong.includes(member)} onChange={() => toggleSplit(member)} className="h-4 w-4 accent-blue-700" /><span className="text-sm text-slate-800">{member}</span></label>)}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="edit-notes">Notes <span className="font-normal text-slate-500">(optional)</span>
            <textarea id="edit-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3" />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="rounded-xl px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
