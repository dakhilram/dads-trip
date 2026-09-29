import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import ExpenseList from "../components/ExpenseList";
import {
  calculateTripSummary,
  expensesCollectionPath,
  formatINR,
  getExpenseDate,
  getMembers,
  tripDocumentPath,
} from "../lib/trip";

export default function Dashboard() {
  const [members, setMembers] = useState(() => getMembers());
  const [expenses, setExpenses] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeTrip = onSnapshot(
      doc(db, ...tripDocumentPath),
      (snapshot) => setMembers(getMembers(snapshot.data())),
      () => setLoadError("Could not load the trip members. Showing the saved member list."),
    );
    const unsubscribeExpenses = onSnapshot(
      collection(db, ...expensesCollectionPath),
      (snapshot) => {
        const list = snapshot.docs
          .map((expense) => ({ id: expense.id, ...expense.data() }))
          .sort((first, second) => {
            const firstTime = getExpenseDate(first)?.getTime() ?? 0;
            const secondTime = getExpenseDate(second)?.getTime() ?? 0;
            return secondTime - firstTime;
          });

        setExpenses(list);
        setIsLoading(false);
      },
      () => {
        setLoadError("Could not load expenses. Check your Firebase connection and permissions.");
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeTrip();
      unsubscribeExpenses();
    };
  }, []);

  const summary = useMemo(
    () => calculateTripSummary(expenses, members),
    [expenses, members],
  );
  const activeMember = members.includes(selectedMember) ? selectedMember : "";
  const memberSettlements = summary.settlements.filter(
    (settlement) => settlement.from === activeMember || settlement.to === activeMember,
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-28 sm:p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Dad&apos;s Trip</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Trip summary</h1>
      </header>

      {loadError && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{loadError}</p>}

      <section className="rounded-2xl bg-blue-700 p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-blue-100">Total spent</p>
        <p className="mt-1 text-4xl font-bold">{formatINR(summary.totalCents)}</p>
        <p className="mt-2 text-sm text-blue-100">{expenses.length} expense{expenses.length === 1 ? "" : "s"} recorded</p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Member summary</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {members.map((member) => {
            const balance = summary.balanceCents[member];
            return (
              <div key={member} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <span className="font-semibold text-slate-800">{member}</span>
                <span className="text-slate-600">Spent {formatINR(summary.spentCents[member])} · Share {formatINR(summary.shareCents[member])}</span>
                <span className={balance >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                  {balance >= 0 ? "+" : "−"}{formatINR(Math.abs(balance))}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <label className="text-sm font-semibold text-slate-700" htmlFor="member-detail">View a member&apos;s settlement</label>
        <select id="member-detail" className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" value={activeMember} onChange={(event) => setSelectedMember(event.target.value)}>
          <option value="">Choose a member</option>
          {members.map((member) => <option key={member} value={member}>{member}</option>)}
        </select>

        {activeMember && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">
              Net balance: <span className={summary.balanceCents[activeMember] >= 0 ? "text-emerald-700" : "text-rose-700"}>
                {summary.balanceCents[activeMember] >= 0 ? "+" : "−"}{formatINR(Math.abs(summary.balanceCents[activeMember]))}
              </span>
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {memberSettlements.length ? memberSettlements.map((settlement) => (
                <p key={`${settlement.from}-${settlement.to}`} className="text-slate-700">
                  {settlement.from === activeMember ? <>Pay <strong>{settlement.to}</strong> {formatINR(settlement.amountCents)}</> : <><strong>{settlement.from}</strong> pays you {formatINR(settlement.amountCents)}</>}
                </p>
              )) : <p className="text-slate-500">No settlement is needed.</p>}
            </div>
          </div>
        )}
      </section>

      <ExpenseList expenses={expenses} members={members} isLoading={isLoading} />
    </main>
  );
}
