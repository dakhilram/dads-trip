import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import AddExpense from "./pages/AddExpense";

export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {page === "dashboard" && <Dashboard />}
      {page === "add" && <AddExpense setPage={setPage} />}

      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around p-3">
        <button
          type="button"
          onClick={() => setPage("dashboard")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            page === "dashboard"
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Dashboard
        </button>

        <button
          type="button"
          onClick={() => setPage("add")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            page === "add"
              ? "bg-emerald-50 text-emerald-700"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Add Expense
        </button>
        </div>
      </nav>
    </div>
  );
}
