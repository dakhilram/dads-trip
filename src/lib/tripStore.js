import { collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { normalizedName, peopleCollectionPath, settlementsCollectionPath, expensesCollectionPath, tripDocumentPath } from "./trip";

export async function importLegacyPeople(names, people) {
  const existingNames = new Set(people.flatMap((person) => [person.name, ...(person.legacyNames ?? [])]).map(normalizedName));
  const namesToImport = names.filter((name) => !existingNames.has(normalizedName(name)));
  if (!namesToImport.length) return;
  const peopleRef = collection(db, ...peopleCollectionPath);
  const batch = writeBatch(db);
  namesToImport.forEach((name) => {
    const personRef = doc(peopleRef);
    batch.set(personRef, { name, legacyNames: [name], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

async function deleteCollectionDocuments(path) {
  while (true) {
    const snapshot = await getDocs(query(collection(db, ...path), limit(500)));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((snapshotDocument) => batch.delete(snapshotDocument.ref));
    await batch.commit();
  }
}

export async function resetActiveTrip() {
  const targets = [peopleCollectionPath, expensesCollectionPath, settlementsCollectionPath];
  const failures = [];
  for (const path of targets) {
    try {
      await deleteCollectionDocuments(path);
    } catch (error) {
      failures.push(`${path.at(-1)}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  if (failures.length) throw new Error(`The reset only partially completed. ${failures.join("; ")}`);
  try {
    await deleteDoc(doc(db, ...tripDocumentPath));
  } catch (error) {
    throw new Error(`Collections were cleared but the trip document could not be removed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}
