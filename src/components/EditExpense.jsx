import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function EditExpense({ expense, onClose }) {
  const members = ["Venu", "Brahmam", "SVR", "Ravi", "PLR"];

  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount);
      setPaidBy(expense.paidBy);
      setSplitAmong(expense.splitAmong);
      setNotes(expense.notes || "");
    }
  }, [expense]);

  const toggleSplit = (person) => {
    if (splitAmong.includes(person)) {
      setSplitAmong(splitAmong.filter((p) => p !== person));
    } else {
      setSplitAmong([...splitAmong, person]);
    }
  };

  const saveChanges = async () => {
    if (!amount || !paidBy || splitAmong.length === 0) {
      alert("Please fill amount, paid by, and split among.");
      return;
    }

    const ref = doc(db, "trips", "dad-trip", "expenses", expense.id);
    await updateDoc(ref, {
      amount: Number(amount),
      paidBy,
      splitAmong,
      notes,
    });

    alert("Expense updated!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50">
      <div className="bg-white w-full max-w-md p-5 rounded-lg shadow-lg space-y-4">
        <h2 className="text-xl font-semibold">Edit Expense</h2>

        <input
          type="number"
          className="border w-full p-2 rounded"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />

        <select
          className="border w-full p-2 rounded"
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
          className="border w-full p-2 rounded"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
        />

        <div className="flex justify-between">
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={saveChanges}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
