import { useEffect, useState } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { expensesCollectionPath, getMembers, toCents, tripDocumentPath } from "../lib/trip";

export default function AddExpense({ setPage }) {
  const [members, setMembers] = useState(() => getMembers());
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [splitAmong, setSplitAmong] = useState([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => onSnapshot(
    doc(db, ...tripDocumentPath),
    (snapshot) => setMembers(getMembers(snapshot.data())),
    () => setError("Could not load the trip members. Please try again."),
  ), []);

  function toggleSplit(member) {
    setSplitAmong((current) => current.includes(member) ? current.filter((person) => person !== member) : [...current, member]);
  }

  async function saveExpense(event) {
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
      await addDoc(collection(db, ...expensesCollectionPath), {
        amount: amountCents / 100,
        paidBy,
        splitAmong: validSplit,
        notes: notes.trim(),
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setPage("dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-5 pb-28 sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Dad&apos;s Trip</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900">Add an expense</h1>
      <p className="mt-2 text-sm text-slate-600">Record who paid and exactly who shares the cost.</p>

      <form className="mt-6 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" onSubmit={saveExpense}>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}

        <label className="block text-sm font-semibold text-slate-700" htmlFor="amount">Amount (₹)
          <input id="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
        </label>

        <label className="block text-sm font-semibold text-slate-700" htmlFor="paid-by">Paid by
          <select id="paid-by" required value={paidBy} onChange={(event) => setPaidBy(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200">
            <option value="">Choose a member</option>
            {members.map((member) => <option key={member} value={member}>{member}</option>)}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">Split among</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {members.map((member) => (
              <label key={member} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50">
                <input type="checkbox" checked={splitAmong.includes(member)} onChange={() => toggleSplit(member)} className="h-4 w-4 accent-emerald-600" />
                <span className="text-sm text-slate-800">{member}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-semibold text-slate-700" htmlFor="notes">Notes <span className="font-normal text-slate-500">(optional)</span>
          <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
        </label>

        <button type="submit" disabled={isSaving} className="w-full rounded-xl bg-emerald-700 p-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isSaving ? "Saving…" : "Save expense"}
        </button>
      </form>
    </main>
  );
}
