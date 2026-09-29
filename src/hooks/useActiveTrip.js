import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  expensesCollectionPath,
  getExpenseDate,
  getLegacyNames,
  peopleCollectionPath,
  tripDocumentPath,
} from "../lib/trip";
import { importLegacyPeople } from "../lib/tripStore";

export default function useActiveTrip() {
  const [trip, setTrip] = useState(null);
  const [people, setPeople] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState({ trip: false, people: false, expenses: false });
  const attemptedImports = useRef(new Set());

  useEffect(() => {
    const unsubscribeTrip = onSnapshot(doc(db, ...tripDocumentPath), (snapshot) => {
      setTrip(snapshot.data() ?? null);
      setLoaded((current) => ({ ...current, trip: true }));
    }, () => {
      setError("Could not load the current trip configuration.");
      setLoaded((current) => ({ ...current, trip: true }));
    });
    const unsubscribePeople = onSnapshot(collection(db, ...peopleCollectionPath), (snapshot) => {
      setPeople(snapshot.docs.map((person) => ({ id: person.id, ...person.data() })).sort((first, second) => first.name.localeCompare(second.name)));
      setLoaded((current) => ({ ...current, people: true }));
    }, () => {
      setError("Could not load trip participants. Check your Firebase permissions.");
      setLoaded((current) => ({ ...current, people: true }));
    });
    const unsubscribeExpenses = onSnapshot(collection(db, ...expensesCollectionPath), (snapshot) => {
      setExpenses(snapshot.docs.map((expense) => ({ id: expense.id, ...expense.data() })).sort((first, second) => (getExpenseDate(second)?.getTime() ?? 0) - (getExpenseDate(first)?.getTime() ?? 0)));
      setLoaded((current) => ({ ...current, expenses: true }));
    }, () => {
      setError("Could not load expenses. Check your Firebase permissions.");
      setLoaded((current) => ({ ...current, expenses: true }));
    });
    return () => {
      unsubscribeTrip();
      unsubscribePeople();
      unsubscribeExpenses();
    };
  }, []);

  const legacyNames = useMemo(() => getLegacyNames(trip, expenses), [trip, expenses]);
  useEffect(() => {
    if (!loaded.trip || !loaded.people || !loaded.expenses || !legacyNames.length) return;
    const importKey = legacyNames.map((name) => name.toLocaleLowerCase()).sort().join("|");
    if (attemptedImports.current.has(importKey)) return;
    attemptedImports.current.add(importKey);
    importLegacyPeople(legacyNames, people).catch(() => setError("Could not import existing participant names. You can add them manually."));
  }, [legacyNames, loaded.expenses, loaded.people, loaded.trip, people]);

  return {
    trip,
    people,
    expenses,
    error,
    clearError: () => setError(""),
    isLoading: !loaded.trip || !loaded.people || !loaded.expenses,
  };
}
