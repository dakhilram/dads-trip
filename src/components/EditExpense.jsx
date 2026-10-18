import { useState } from "react";
import { deleteField, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import SplitControls from "./SplitControls";
import {
  expensesCollectionPath,
  getExpenseAmountPaise,
  getExpensePersonIds,
  isRecordedSettlement,
  resolvePersonId,
  toBasisPoints,
  toPaise,
  validateExpenseSplit,
} from "../lib/trip";

export default function EditExpense({ expense, people, storagePath = expensesCollectionPath, onClose }) {
  const initialPayer = resolvePersonId(expense.paidBy ?? expense.fromId, people) ?? "";
  const initialParticipants = getExpensePersonIds(expense, people);
  const isLegacyStoredPayback = storagePath !== expensesCollectionPath;
  const [entryType, setEntryType] = useState(isRecordedSettlement(expense) || isLegacyStoredPayback ? "payback" : "expense");
  const [amount, setAmount] = useState(String(getExpenseAmountPaise(expense) / 100));
  const [paidBy, setPaidBy] = useState(initialPayer);
  const [paybackTo, setPaybackTo] = useState(() => resolvePersonId(expense.toId, people) ?? initialParticipants.find((id) => id !== initialPayer) ?? "");
  const [participants, setParticipants] = useState(initialParticipants);
  const [splitType, setSplitType] = useState(expense.splitType ?? "equal");
  const [exactValues, setExactValues] = useState(() => Object.fromEntries(Object.entries(expense.exactAmountsPaise ?? {}).map(([id, value]) => [id, String(value / 100)])));
  const [percentageValues, setPercentageValues] = useState(() => Object.fromEntries(Object.entries(expense.percentageBps ?? {}).map(([id, value]) => [id, String(value / 100)])));
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const activeIds = new Set(people.map((person) => person.id));

  async function saveChanges(event) {
    event.preventDefault();
    const amountPaise = toPaise(amount);

    if (entryType === "payback") {
      const validationError = amountPaise <= 0
        ? "Enter a positive payback amount."
        : !activeIds.has(paidBy)
          ? "Choose who paid the money back."
          : !activeIds.has(paybackTo)
            ? "Choose who received the payback."
            : paidBy === paybackTo
              ? "A person cannot pay themselves."
              : "";
      if (validationError) {
        setError(validationError);
        return;
      }

      setError("");
      setIsSaving(true);
      try {
        await updateDoc(doc(db, ...storagePath, expense.id), {
          amountPaise,
          paidBy,
          fromId: paidBy,
          toId: paybackTo,
          participants: [paybackTo],
          splitType: "equal",
          recordType: "settlement",
          notes: notes.trim(),
          updatedAt: serverTimestamp(),
        });
        onClose();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not update this payback. Please try again.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const validParticipants = participants.filter((id) => activeIds.has(id));
    const validationError = amountPaise <= 0
      ? "Enter a positive expense amount."
      : !activeIds.has(paidBy)
        ? "Choose the person who paid."
        : validateExpenseSplit(amountPaise, validParticipants, splitType, exactValues, percentageValues);

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      amountPaise,
      paidBy,
      participants: validParticipants,
      splitType,
      recordType: "expense",
      notes: notes.trim(),
      fromId: deleteField(),
      toId: deleteField(),
      updatedAt: serverTimestamp(),
    };
    if (splitType === "exact") payload.exactAmountsPaise = Object.fromEntries(validParticipants.map((id) => [id, toPaise(exactValues[id])]));
    if (splitType === "percentage") payload.percentageBps = Object.fromEntries(validParticipants.map((id) => [id, toBasisPoints(percentageValues[id])]));

    setError("");
    setIsSaving(true);
    try {
      await updateDoc(doc(db, ...storagePath, expense.id), payload);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update this expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-expense-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="edit-expense-title" className="text-xl font-bold text-slate-900">{entryType === "payback" ? "Edit payback" : "Edit expense"}</h2>
        <button type="button" onClick={onClose} className="text-sm font-bold text-slate-600 hover:text-slate-900">Close</button>
      </div>

      <form className="mt-5 space-y-4" onSubmit={saveChanges}>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}

        {!isLegacyStoredPayback && <fieldset>
          <legend className="text-sm font-semibold text-slate-700">Entry type</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className={`cursor-pointer rounded-xl border p-3 text-sm font-semibold ${entryType === "expense" ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700"}`}>
              <input type="radio" name="entry-type" value="expense" checked={entryType === "expense"} onChange={() => setEntryType("expense")} className="mr-2" />
              Trip expense
            </label>
            <label className={`cursor-pointer rounded-xl border p-3 text-sm font-semibold ${entryType === "payback" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-700"}`}>
              <input type="radio" name="entry-type" value="payback" checked={entryType === "payback"} onChange={() => setEntryType("payback")} className="mr-2" />
              Payback
            </label>
          </div>
          {entryType === "payback" && <p className="mt-2 text-xs text-slate-500">Paybacks reduce outstanding balances and are never added to Total spent.</p>}
        </fieldset>}

        <label className="block text-sm font-semibold text-slate-700" htmlFor="edit-amount">Amount (₹)
          <input id="edit-amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
        </label>

        <label className="block text-sm font-semibold text-slate-700" htmlFor="edit-paid-by">{entryType === "payback" ? "Paid back by" : "Paid by"}
          <select id="edit-paid-by" required value={paidBy} onChange={(event) => setPaidBy(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3">
            <option value="">Choose a person</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>

        {entryType === "payback" ? <label className="block text-sm font-semibold text-slate-700" htmlFor="edit-payback-to">Paid to
          <select id="edit-payback-to" required value={paybackTo} onChange={(event) => setPaybackTo(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3">
            <option value="">Choose a person</option>
            {people.filter((person) => person.id !== paidBy).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label> : <SplitControls people={people} participants={participants} setParticipants={setParticipants} splitType={splitType} setSplitType={setSplitType} exactValues={exactValues} setExactValues={setExactValues} percentageValues={percentageValues} setPercentageValues={setPercentageValues} />}

        <label className="block text-sm font-semibold text-slate-700" htmlFor="edit-notes">Notes <span className="font-normal text-slate-500">(optional)</span>
          <textarea id="edit-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3" />
        </label>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-slate-700 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  </div>;
}
