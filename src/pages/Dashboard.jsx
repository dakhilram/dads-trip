import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import ExpenseList from "../components/ExpenseList";

export default function Dashboard({ onSelectPerson, onAddExpense }) {
  const members = ["Venu", "Brahmam", "SVR", "Ravi", "PLR"];

  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({});
  const [shares, setShares] = useState({});
  const [totalTrip, setTotalTrip] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "trips", "dad-trip", "expenses"),
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

        setExpenses(list);
        calculateSummary(list);
      }
    );

    return () => unsub();
  }, []);

  const calculateSummary = (list) => {
    let spent = {};
    let share = {};

    members.forEach((m) => {
      spent[m] = 0;
      share[m] = 0;
    });

    let totalAmount = 0;

    list.forEach((exp) => {
      const amount = exp.amount;
      const payer = exp.paidBy;
      const splitAmong = exp.splitAmong;

      totalAmount += amount;
      spent[payer] += amount;

      const perPerson = amount / splitAmong.length;

      splitAmong.forEach((p) => {
        share[p] += perPerson;
      });
    });

    setTotals(spent);
    setShares(share);
    setTotalTrip(totalAmount);
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Trip Summary</h1>

      {/* Total spent */}
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-600 text-sm">Total Spent</p>
        <p className="text-3xl font-bold">₹{totalTrip.toFixed(2)}</p>
      </div>

      {/* Member Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-600 text-sm mb-2">Member Summary</p>

        {members.map((m) => (
          <div key={m} className="flex justify-between py-1 border-b">
            <span>{m}</span>
            <span>
              Spent: ₹{totals[m]?.toFixed(2)} | Share: ₹{shares[m]?.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Person selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-600 text-sm">Choose a Person</p>

        <select
          className="w-full p-3 border rounded mt-2"
          onChange={(e) => {
            if (e.target.value) onSelectPerson(e.target.value);
          }}
        >
          <option value="">Select...</option>
          {members.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Expense list */}
      <ExpenseList expenses={expenses} />

      {/* Add Expense button */}
      <button
        onClick={onAddExpense}
        className="w-full bg-blue-600 text-white p-3 rounded-lg text-center"
      >
        + Add Expense
      </button>
    </div>
  );
}
