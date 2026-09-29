import { useMemo, useState } from "react";
import ExpenseList from "../components/ExpenseList";
import ExportTripDialog from "../components/ExportTripDialog";
import ResetTripDialog from "../components/ResetTripDialog";
import { buildTripExport, downloadTripCsv, downloadTripPdf } from "../lib/exportTrip";
import { calculateTripSummary, formatINR } from "../lib/trip";
import { resetActiveTrip } from "../lib/tripStore";

export default function Dashboard({ people, expenses, isLoading, loadError, setPage }) {
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const [resetError, setResetError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const summary = useMemo(() => calculateTripSummary(expenses, people), [expenses, people]);
  const peopleById = useMemo(() => Object.fromEntries(people.map((person) => [person.id, person])), [people]);
  const activePerson = peopleById[selectedPersonId];
  const personSettlements = summary.settlements.filter((settlement) => settlement.fromId === selectedPersonId || settlement.toId === selectedPersonId);
  const canExport = people.length > 0 || expenses.length > 0;

  function exportData() {
    return buildTripExport({ people, expenses, summary });
  }

  async function handlePdfExport(closeExportDialog = true) {
    setExportError("");
    setIsExporting(true);
    try {
      await downloadTripPdf(exportData());
      if (closeExportDialog) setIsExportDialogOpen(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not create the PDF report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function handleCsvExport() {
    setExportError("");
    try {
      downloadTripCsv(exportData());
      setIsExportDialogOpen(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not create the CSV file. Please try again.");
    }
  }

  async function handleReset() {
    setResetError("");
    setIsResetting(true);
    try {
      await resetActiveTrip();
      setSelectedPersonId("");
      setIsResetDialogOpen(false);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "The trip could not be reset. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }

  return <main className="mx-auto max-w-4xl space-y-6 p-4 pb-28 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Dad&apos;s Trip</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Current trip</h1></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setIsExportDialogOpen(true)} disabled={!canExport || isExporting} title={canExport ? "Export current trip" : "Add people or expenses before exporting"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">Export Trip</button><button type="button" onClick={() => { setResetError(""); setIsResetDialogOpen(true); }} disabled={isResetting} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">Start new trip</button></div>
    </header>

    {loadError && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{loadError}</p>}

    <section className="rounded-2xl bg-blue-700 p-5 text-white shadow-sm"><p className="text-sm font-medium text-blue-100">Total spent</p><p className="mt-1 break-words text-4xl font-bold">{formatINR(summary.totalPaise)}</p><p className="mt-2 text-sm text-blue-100">{people.length} participant{people.length === 1 ? "" : "s"} · {expenses.length} expense{expenses.length === 1 ? "" : "s"}</p></section>

    {!isLoading && people.length === 0 ? <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200"><h2 className="text-xl font-bold text-slate-900">No people added yet</h2><p className="mt-2 text-slate-600">Add participants to start the trip.</p><button type="button" onClick={() => setPage("people")} className="mt-5 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800">Add people</button></section> : <>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">Participants</h2><button type="button" onClick={() => setPage("people")} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Manage people</button></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="pb-2 font-semibold">Person</th><th className="pb-2 font-semibold">Paid</th><th className="pb-2 font-semibold">Share</th><th className="pb-2 font-semibold">Balance</th></tr></thead><tbody>{people.map((person) => { const balance = summary.balancePaise[person.id]; return <tr key={person.id} className="border-b border-slate-100 last:border-0"><td className="max-w-40 break-words py-3 font-semibold text-slate-900">{person.name}</td><td className="whitespace-nowrap py-3 text-slate-700">{formatINR(summary.paidPaise[person.id])}</td><td className="whitespace-nowrap py-3 text-slate-700">{formatINR(summary.owedPaise[person.id])}</td><td className={`whitespace-nowrap py-3 font-bold ${balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{balance >= 0 ? "+" : "−"}{formatINR(Math.abs(balance))}</td></tr>; })}</tbody></table></div></section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><label className="text-sm font-semibold text-slate-700" htmlFor="person-settlement">View settlement for a person</label><select id="person-settlement" value={activePerson ? selectedPersonId : ""} onChange={(event) => setSelectedPersonId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"><option value="">Choose a person</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>{activePerson && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">Net balance: <span className={summary.balancePaise[activePerson.id] >= 0 ? "text-emerald-700" : "text-rose-700"}>{summary.balancePaise[activePerson.id] >= 0 ? "+" : "−"}{formatINR(Math.abs(summary.balancePaise[activePerson.id]))}</span></p><div className="mt-3 space-y-2 text-sm">{personSettlements.length ? personSettlements.map((settlement) => <p key={`${settlement.fromId}-${settlement.toId}`} className="text-slate-700">{settlement.fromId === activePerson.id ? <>Pay <strong>{peopleById[settlement.toId]?.name}</strong> {formatINR(settlement.amountPaise)}</> : <><strong>{peopleById[settlement.fromId]?.name}</strong> pays you {formatINR(settlement.amountPaise)}</>}</p>) : <p className="text-slate-500">No settlement is needed.</p>}</div></div>}</section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Expenses</h2><p className="mt-1 text-sm text-slate-500">{isLoading ? "Loading expenses…" : expenses.length ? "Newest first" : "No expenses recorded yet."}</p></div><button type="button" onClick={() => setPage("add")} disabled={!people.length} className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">Add expense</button></div></section>
      {!isLoading && <ExpenseList expenses={expenses} people={people} />}
    </>}

    <ExportTripDialog isOpen={isExportDialogOpen} onClose={() => { setExportError(""); setIsExportDialogOpen(false); }} onPdf={() => handlePdfExport()} onCsv={handleCsvExport} isExporting={isExporting} error={exportError} />
    <ResetTripDialog isOpen={isResetDialogOpen} onClose={() => setIsResetDialogOpen(false)} onExportBeforeReset={() => handlePdfExport(false)} onConfirm={handleReset} isExporting={isExporting} isResetting={isResetting} error={resetError || exportError} />
  </main>;
}
