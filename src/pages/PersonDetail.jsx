import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function PersonDetail({ person, goBack }) {
  const members = ["Venu", "Brahmam", "SVR", "Ravi", "PLR"];

  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({});
  const [shares, setShares] = useState({});
  const [balances, setBalances] = useState({});
  const [results, setResults] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "trips", "dad-trip", "expenses"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setExpenses(list);
        calculateBalances(list);
      }
    );

    return () => unsub();
  }, []);

  const calculateBalances = (list) => {
    let spent = {};
    let share = {};
    let balance = {};

    members.forEach((m) => {
      spent[m] = 0;
      share[m] = 0;
    });

    // calculate spent + share
    list.forEach((exp) => {
      const amount = exp.amount;
      const payer = exp.paidBy;
      const splitAmong = exp.splitAmong;

      spent[payer] += amount;

      const per = amount / splitAmong.length;
      splitAmong.forEach((p) => {
        share[p] += per;
      });
    });

    // calc balances
    members.forEach((m) => {
      balance[m] = spent[m] - share[m];
    });

    setTotals(spent);
    setShares(share);
    setBalances(balance);

    computeSettlement(balance);
  };

  const computeSettlement = (balance) => {
    let owes = [];
    let gets = [];

    // separate negative and positive
    members.forEach((m) => {
      if (balance[m] < 0) {
        owes.push({ name: m, amount: Math.abs(balance[m]) });
      } else if (balance[m] > 0) {
        gets.push({ name: m, amount: balance[m] });
      }
    });

    let transactions = [];

    let i = 0, j = 0;

    while (i < owes.length && j < gets.length) {
      let owePerson = owes[i];
      let getPerson = gets[j];
      let amount = Math.min(owePerson.amount, getPerson.amount);

      transactions.push({
        from: owePerson.name,
        to: getPerson.name,
        amount
      });

      owePerson.amount -= amount;
      getPerson.amount -= amount;

      if (owePerson.amount === 0) i++;
      if (getPerson.amount === 0) j++;
    }

    setResults(transactions);
  };

  const myTransactions = results.filter(
    (t) => t.from === person || t.to === person
  );

  const net = balances[person] || 0;

  return (
  <div className="p-4 space-y-4 pb-20">
    <button onClick={goBack} className="text-blue-600 text-sm">← Back</button>

    <h1 className="text-2xl font-bold">{person}'s Balance</h1>

    <div className="bg-white p-4 rounded-lg shadow space-y-1">
      <p className="text-sm">Spent: ₹{totals[person]?.toFixed(2)}</p>
      <p className="text-sm">Share: ₹{shares[person]?.toFixed(2)}</p>
      <p className="font-bold text-lg mt-2">
        Net: {net >= 0 ? "+" : "-"}₹{Math.abs(net).toFixed(2)}
      </p>
    </div>

    <div className="bg-white p-4 rounded-lg shadow space-y-2">
      <h2 className="font-semibold text-lg mb-1">Settlement</h2>

      {myTransactions.length === 0 && (
        <p className="text-gray-500 text-sm">No settlements for this person.</p>
      )}

      {myTransactions.map((t, i) => (
        <div key={i} className="border-b pb-2 text-sm">
          {t.from === person ? (
            <>You owe <b>{t.to}</b> ₹{t.amount.toFixed(2)}</>
          ) : (
            <><b>{t.from}</b> owes you ₹{t.amount.toFixed(2)}</>
          )}
        </div>
      ))}
    </div>
  </div>
);
}