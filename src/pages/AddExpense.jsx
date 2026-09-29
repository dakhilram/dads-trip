import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { expensesCollectionPath, toBasisPoints, toPaise, validateExpenseSplit } from "../lib/trip";
import SplitControls from "../components/SplitControls";

export default function AddExpense({ people, setPage }) {
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [participants, setParticipants] = useState([]);
  const [splitType, setSplitType] = useState("equal");
  const [exactValues, setExactValues] = useState({});
  const [percentageValues, setPercentageValues] = useState({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const activeIds = new Set(people.map((person) => person.id));

  async function saveExpense(event) {
    event.preventDefault();
    const amountPaise = toPaise(amount);
    const validParticipants = participants.filter((id) => activeIds.has(id));
    const validationError = amountPaise <= 0 ? "Enter a positive expense amount." : !activeIds.has(paidBy) ? "Choose the person who paid." : validateExpenseSplit(amountPaise, validParticipants, splitType, exactValues, percentageValues);
    if (validationError) {
      setError(validationError);
      return;
    }
    const payload = { amountPaise, paidBy, participants: validParticipants, splitType, notes: notes.trim(), date: serverTimestamp(), createdAt: serverTimestamp() };
    if (splitType === "exact") payload.exactAmountsPaise = Object.fromEntries(validParticipants.map((id) => [id, toPaise(exactValues[id])])) ;
    if (splitType === "percentage") payload.percentageBps = Object.fromEntries(validParticipants.map((id) => [id, toBasisPoints(percentageValues[id])])) ;
    setError("");
    setIsSaving(true);
    try {
      await addDoc(collection(db, ...expensesCollectionPath), payload);
      setPage("dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!people.length) return <main className="mx-auto max-w-xl p-5 pb-28 sm:p-6"><h1 className="text-3xl font-bold text-slate-900">Add an expense</h1><p className="mt-3 text-slate-600">Add people before recording an expense.</p><button type="button" onClick={() => setPage("people")} className="mt-5 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white">Manage people</button></main>;
  return <main className="mx-auto max-w-xl p-5 pb-28 sm:p-6"><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Dad&apos;s Trip</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Add an expense</h1><form className="mt-6 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" onSubmit={saveExpense}>{error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}<label className="block text-sm font-semibold text-slate-700" htmlFor="amount">Amount (₹)<input id="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-semibold text-slate-700" htmlFor="paid-by">Paid by<select id="paid-by" required value={paidBy} onChange={(event) => setPaidBy(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Choose a person</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><SplitControls people={people} participants={participants} setParticipants={setParticipants} splitType={splitType} setSplitType={setSplitType} exactValues={exactValues} setExactValues={setExactValues} percentageValues={percentageValues} setPercentageValues={setPercentageValues} /><label className="block text-sm font-semibold text-slate-700" htmlFor="notes">Notes <span className="font-normal text-slate-500">(optional)</span><textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3" /></label><button type="submit" disabled={isSaving} className="w-full rounded-xl bg-emerald-700 p-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving…" : "Save expense"}</button></form></main>;
}
