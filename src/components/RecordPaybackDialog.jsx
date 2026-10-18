import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { formatINR, settlementsCollectionPath, toPaise } from "../lib/trip";

export default function RecordPaybackDialog({ isOpen, onClose, people, summary }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const debtors = useMemo(() => people.filter((person) => (summary.balancePaise[person.id] ?? 0) < 0), [people, summary.balancePaise]);
  const creditors = useMemo(() => people.filter((person) => (summary.balancePaise[person.id] ?? 0) > 0), [people, summary.balancePaise]);
  const maxPaybackPaise = fromId && toId
    ? Math.min(Math.abs(summary.balancePaise[fromId] ?? 0), summary.balancePaise[toId] ?? 0)
    : 0;

  if (!isOpen) return null;

  async function savePayback(event) {
    event.preventDefault();
    const amountPaise = toPaise(amount);
    if (!fromId || !toId) {
      setError("Choose who paid and who received the payback.");
      return;
    }
    if (fromId === toId) {
      setError("A person cannot pay themselves.");
      return;
    }
    if (maxPaybackPaise <= 0) {
      setError("There is no outstanding balance between these participants.");
      return;
    }
    if (amountPaise <= 0) {
      setError("Enter a positive payback amount.");
      return;
    }
    if (amountPaise > maxPaybackPaise) {
      setError(`Only ${formatINR(maxPaybackPaise)} remains available to settle between these participants.`);
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await addDoc(collection(db, ...settlementsCollectionPath), {
        recordType: "settlement",
        fromId,
        toId,
        amountPaise,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setFromId("");
      setToId("");
      setAmount("");
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not record this payback. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" role="presentation">
    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="record-payback-title">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="record-payback-title" className="text-xl font-bold text-slate-900">Record payback</h2>
          <p className="mt-1 text-sm text-slate-500">This changes balances only. It does not increase Total spent.</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-bold text-slate-600 hover:text-slate-900">Close</button>
      </div>

      <form className="mt-5 space-y-4" onSubmit={savePayback}>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}

        <label className="block text-sm font-semibold text-slate-700" htmlFor="payback-from">Who paid back?
          <select id="payback-from" required value={fromId} onChange={(event) => { setFromId(event.target.value); setAmount(""); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3">
            <option value="">Choose a person</option>
            {debtors.map((person) => <option key={person.id} value={person.id}>{person.name} · owes {formatINR(Math.abs(summary.balancePaise[person.id]))}</option>)}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700" htmlFor="payback-to">Paid to
          <select id="payback-to" required value={toId} onChange={(event) => { setToId(event.target.value); setAmount(""); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3">
            <option value="">Choose a person</option>
            {creditors.map((person) => <option key={person.id} value={person.id}>{person.name} · should receive {formatINR(summary.balancePaise[person.id])}</option>)}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700" htmlFor="payback-amount">Amount (₹)
          <input id="payback-amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
        </label>

        {maxPaybackPaise > 0 && <p className="text-sm text-slate-500">Maximum for this payback: <strong>{formatINR(maxPaybackPaise)}</strong></p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-slate-700 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving…" : "Record payback"}</button>
        </div>
      </form>
    </div>
  </div>;
}
