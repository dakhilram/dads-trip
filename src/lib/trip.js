export const TRIP_ID = "dad-trip";
export const tripDocumentPath = ["trips", TRIP_ID];
export const peopleCollectionPath = [...tripDocumentPath, "people"];
export const expensesCollectionPath = [...tripDocumentPath, "expenses"];
export const settlementsCollectionPath = [...tripDocumentPath, "settlements"];

export function normalizeName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ");
}

export function normalizedName(name) {
  return normalizeName(name).toLocaleLowerCase();
}

export function toPaise(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function toBasisPoints(value) {
  const percentage = Number(value);
  return Number.isFinite(percentage) ? Math.round(percentage * 100) : 0;
}

export function validateExpenseSplit(amountPaise, participants, splitType, exactValues, percentageValues) {
  if (!participants.length) return "Select at least one participant.";
  if (splitType === "exact") {
    const total = participants.reduce((sum, id) => sum + toPaise(exactValues[id]), 0);
    return total === amountPaise ? "" : `Exact shares must add up to the expense amount (${(amountPaise / 100).toFixed(2)}).`;
  }
  if (splitType === "percentage") {
    const total = participants.reduce((sum, id) => sum + toBasisPoints(percentageValues[id]), 0);
    return total === 10000 ? "" : "Percentages must add up to 100.00%.";
  }
  return "";
}

export function formatINR(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100);
}

export function getExpenseDate(expense) {
  const value = expense?.date ?? expense?.createdAt;
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatExpenseDate(expense) {
  const date = getExpenseDate(expense);
  return date ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date) : "Pending";
}

export function getLegacyNames(trip, expenses) {
  const names = [
    ...(Array.isArray(trip?.members) ? trip.members : []),
    ...expenses.flatMap((expense) => {
      const isLegacyExpense = Array.isArray(expense.splitAmong) || !Number.isInteger(expense.amountPaise);
      return isLegacyExpense ? [typeof expense.paidBy === "string" ? expense.paidBy : "", ...(Array.isArray(expense.splitAmong) ? expense.splitAmong : [])] : [];
    }),
  ].filter((name) => typeof name === "string" && normalizeName(name)).map(normalizeName);
  return [...new Map(names.map((name) => [normalizedName(name), name])).values()];
}

export function personMatchesLegacyName(person, name) {
  const wanted = normalizedName(name);
  return normalizedName(person.name) === wanted || (Array.isArray(person.legacyNames) && person.legacyNames.some((legacyName) => normalizedName(legacyName) === wanted));
}

export function resolvePersonId(value, people) {
  if (typeof value !== "string") return null;
  if (people.some((person) => person.id === value)) return value;
  return people.find((person) => personMatchesLegacyName(person, value))?.id ?? null;
}

export function getExpensePersonIds(expense, people) {
  const references = Array.isArray(expense.participants) ? expense.participants : Array.isArray(expense.splitAmong) ? expense.splitAmong : [];
  return [...new Set(references.map((reference) => resolvePersonId(reference, people)).filter(Boolean))];
}

export function getExpenseAmountPaise(expense) {
  return Number.isInteger(expense.amountPaise) ? expense.amountPaise : toPaise(expense.amount);
}

function allocatePercentageShares(amountPaise, participantIds, percentageBps) {
  const allocations = participantIds.map((id, index) => {
    const numerator = amountPaise * (percentageBps[id] ?? 0);
    return { id, index, amountPaise: Math.floor(numerator / 10000), remainder: numerator % 10000 };
  });
  let remainingPaise = amountPaise - allocations.reduce((sum, allocation) => sum + allocation.amountPaise, 0);
  allocations.slice().sort((first, second) => second.remainder - first.remainder || first.index - second.index).forEach((allocation) => {
    if (remainingPaise > 0) {
      allocation.amountPaise += 1;
      remainingPaise -= 1;
    }
  });
  return Object.fromEntries(allocations.map((allocation) => [allocation.id, allocation.amountPaise]));
}

export function getExpenseShares(expense, people) {
  const participantIds = getExpensePersonIds(expense, people);
  const amountPaise = getExpenseAmountPaise(expense);
  if (amountPaise <= 0 || !participantIds.length) return null;
  const splitType = expense.splitType ?? "equal";

  if (splitType === "exact") {
    const exactAmountsPaise = expense.exactAmountsPaise ?? {};
    const total = participantIds.reduce((sum, id) => sum + (exactAmountsPaise[id] ?? 0), 0);
    return Number.isInteger(total) && total === amountPaise ? exactAmountsPaise : null;
  }
  if (splitType === "percentage") {
    const percentageBps = expense.percentageBps ?? {};
    const total = participantIds.reduce((sum, id) => sum + (percentageBps[id] ?? 0), 0);
    return Number.isInteger(total) && total === 10000 ? allocatePercentageShares(amountPaise, participantIds, percentageBps) : null;
  }

  const baseShare = Math.floor(amountPaise / participantIds.length);
  const remainder = amountPaise % participantIds.length;
  return Object.fromEntries(participantIds.map((id, index) => [id, baseShare + (index < remainder ? 1 : 0)]));
}

export function calculateTripSummary(expenses, people) {
  const paidPaise = Object.fromEntries(people.map((person) => [person.id, 0]));
  const owedPaise = Object.fromEntries(people.map((person) => [person.id, 0]));
  let totalPaise = 0;

  expenses.forEach((expense) => {
    const amountPaise = getExpenseAmountPaise(expense);
    const paidBy = resolvePersonId(expense.paidBy, people);
    const shares = getExpenseShares(expense, people);
    if (amountPaise <= 0 || !paidBy || !shares) return;
    totalPaise += amountPaise;
    paidPaise[paidBy] += amountPaise;
    Object.entries(shares).forEach(([personId, share]) => { owedPaise[personId] += share; });
  });

  const balancePaise = Object.fromEntries(people.map((person) => [person.id, paidPaise[person.id] - owedPaise[person.id]]));
  const debtors = people.filter((person) => balancePaise[person.id] < 0).map((person) => ({ person, amountPaise: Math.abs(balancePaise[person.id]) }));
  const creditors = people.filter((person) => balancePaise[person.id] > 0).map((person) => ({ person, amountPaise: balancePaise[person.id] }));
  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountPaise = Math.min(debtor.amountPaise, creditor.amountPaise);
    settlements.push({ fromId: debtor.person.id, toId: creditor.person.id, amountPaise });
    debtor.amountPaise -= amountPaise;
    creditor.amountPaise -= amountPaise;
    if (debtor.amountPaise === 0) debtorIndex += 1;
    if (creditor.amountPaise === 0) creditorIndex += 1;
  }
  return { totalPaise, paidPaise, owedPaise, balancePaise, settlements };
}

export function isPersonReferenced(person, expenses) {
  return expenses.some((expense) => expense.paidBy === person.id || expense.participants?.includes(person.id) || personMatchesLegacyName(person, expense.paidBy) || expense.splitAmong?.some((name) => personMatchesLegacyName(person, name)));
}
