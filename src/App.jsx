import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import PersonDetail from "./pages/PersonDetail";
import AddExpense from "./pages/AddExpense";

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [selectedPerson, setSelectedPerson] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Screens */}
      {screen === "dashboard" && (
        <Dashboard
          onSelectPerson={(person) => {
            setSelectedPerson(person);
            setScreen("person");
          }}
          onAddExpense={() => setScreen("add")}
        />
      )}

      {screen === "person" && (
        <PersonDetail
          person={selectedPerson}
          goBack={() => setScreen("dashboard")}
        />
      )}

      {screen === "add" && <AddExpense goBack={() => setScreen("dashboard")} />}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t flex justify-around py-3">
        <button
          className={`text-sm ${
            screen === "dashboard" ? "text-blue-600 font-semibold" : ""
          }`}
          onClick={() => setScreen("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={`text-sm ${
            screen === "add" ? "text-blue-600 font-semibold" : ""
          }`}
          onClick={() => setScreen("add")}
        >
          Add Expense
        </button>
      </div>
    </div>
  );
}
