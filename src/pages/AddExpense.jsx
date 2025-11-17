import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function AddExpense({ goBack }) {
  const members = ["Venu", "Brahmam", "SVR", "Ravi", "PLR"];

  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState([]);
  const [notes, setNotes] = useState("");

  const toggleSplit = (person) => {
    if (splitAmong.includes(person)) {
      setSplitAmong(splitAmong.filter((p) => p !== person));
    } else {
      setSplitAmong([...splitAmong, person]);
    }
  };

  const saveExpense = async () => {
    if (!amount || !paidBy || splitAmong.length === 0) {
      alert("Please fill all required fields.");
      return;
    }

    await addDoc(
      collection(db, "trips", "dad-trip", "expenses"),
      {
        amount: Number(amount),
        paidBy,
        splitAmong,
        notes,
        date: serverTimestamp()
      }
    );

    alert("Expense added!");
    goBack();
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <button onClick={goBack} className="text-blue-600 text-sm">← Back</button>

      <h1 className="text-2xl font-bold">Add Expense</h1>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">

        <input
          type="number"
          placeholder="Amount (₹)"
          className="border w-full p-3 rounded"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select
          className="border w-full p-3 rounded"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
        >
          <option value="">Paid By</option>
          {members.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <div>
          <p className="font-medium mb-1">Split Among:</p>

          <div className="grid grid-cols-2 gap-2">
            {members.map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={splitAmong.includes(m)}
                  onChange={() => toggleSplit(m)}
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        <textarea
          placeholder="Notes (optional)"
          className="border w-full p-3 rounded"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button
          onClick={saveExpense}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold"
        >
          Save Expense
        </button>

      </div>
    </div>
  );
}
