import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { isPersonReferenced, normalizeName, normalizedName, peopleCollectionPath } from "../lib/trip";

export default function People({ people, expenses, setPage }) {
  const [name, setName] = useState("");
  const [editingPerson, setEditingPerson] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  function beginEdit(person) {
    setEditingPerson(person);
    setName(person.name);
    setError("");
  }

  function cancelEdit() {
    setEditingPerson(null);
    setName("");
    setError("");
  }

  async function savePerson(event) {
    event.preventDefault();
    const cleanName = normalizeName(name);
    if (!cleanName) {
      setError("A name is required.");
      return;
    }
    if (people.some((person) => person.id !== editingPerson?.id && [person.name, ...(person.legacyNames ?? [])].some((existingName) => normalizedName(existingName) === normalizedName(cleanName)))) {
      setError("That person is already in this trip.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      if (editingPerson) {
        await updateDoc(doc(db, ...peopleCollectionPath, editingPerson.id), { name: cleanName, legacyNames: [...new Set([...(editingPerson.legacyNames ?? []), editingPerson.name])], updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, ...peopleCollectionPath), { name: cleanName, legacyNames: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      cancelEdit();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this person. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removePerson(person) {
    if (isPersonReferenced(person, expenses)) {
      setError("This person is used in existing expenses. Edit or delete those expenses before removing them.");
      return;
    }
    if (!window.confirm(`Remove ${person.name} from this trip?`)) return;
    setError("");
    setDeletingId(person.id);
    try {
      await deleteDoc(doc(db, ...peopleCollectionPath, person.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove this person. Please try again.");
    } finally {
      setDeletingId("");
    }
  }

  return <main className="mx-auto max-w-2xl space-y-6 p-4 pb-28 sm:p-6"><header className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Dad&apos;s Trip</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Manage people</h1></div><button type="button" onClick={() => setPage("dashboard")} className="rounded-xl px-3 py-2 font-bold text-slate-700 hover:bg-slate-200">Done</button></header><section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-bold text-slate-900">{editingPerson ? `Rename ${editingPerson.name}` : "Add a person"}</h2><form className="mt-4 flex flex-wrap gap-3" onSubmit={savePerson}><label className="sr-only" htmlFor="person-name">Person name</label><input id="person-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Person name" maxLength={80} className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" /><button type="submit" disabled={isSaving} className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving…" : editingPerson ? "Save name" : "Add person"}</button>{editingPerson && <button type="button" onClick={cancelEdit} className="rounded-xl px-4 py-3 font-bold text-slate-700 hover:bg-slate-100">Cancel</button>}</form>{error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}</section><section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-bold text-slate-900">Current participants</h2>{people.length ? <ul className="mt-3 divide-y divide-slate-100">{people.map((person) => <li key={person.id} className="flex items-center justify-between gap-3 py-3"><span className="font-semibold text-slate-900">{person.name}</span><div className="flex gap-3 text-sm font-bold"><button type="button" className="text-blue-700 hover:text-blue-900" onClick={() => beginEdit(person)}>Rename</button><button type="button" disabled={deletingId === person.id} className="text-rose-700 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => removePerson(person)}>{deletingId === person.id ? "Removing…" : "Remove"}</button></div></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No people added yet. Add participants to start the trip.</p>}</section><p className="text-sm text-slate-500">A person cannot be removed while they are referenced by an expense.</p></main>;
}
