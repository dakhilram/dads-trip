import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import EditExpense from "./EditExpense";

export default function ExpenseList({ expenses }) {
  const [editing, setEditing] = useState(null);

  const deleteExpense = async (id) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await deleteDoc(doc(db, "trips", "dad-trip", "expenses", id));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <h3 className="text-lg font-bold mb-2">Recent Expenses</h3>

      {expenses.length === 0 && (
        <p className="text-gray-500 text-sm">No expenses added yet.</p>
      )}

      <div className="space-y-3">
        {expenses.map((exp) => (
          <div
            key={exp.id}
            className="border-b pb-3 flex justify-between items-start text-sm"
          >
            {/* Expense Info */}
            <div>
              <p className="font-semibold">
                ₹{exp.amount} — {exp.paidBy}
              </p>

              <p className="text-gray-600 text-xs">
                Split: {exp.splitAmong.join(", ")}
              </p>

              {exp.notes && (
                <p className="text-gray-500 text-xs">Note: {exp.notes}</p>
              )}
            </div>

            {/* Edit + Delete + Date */}
            <div className="flex flex-col items-end text-right">
              <button
                className="text-blue-500 text-xs mb-1"
                onClick={() => setEditing(exp)}
              >
                Edit
              </button>

              <button
                className="text-red-500 text-xs mb-1"
                onClick={() => deleteExpense(exp.id)}
              >
                Delete
              </button>

              <span className="text-gray-500 text-xs">
                {exp.date?.seconds
                  ? new Date(exp.date.seconds * 1000).toLocaleDateString()
                  : "--"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditExpense
          expense={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
