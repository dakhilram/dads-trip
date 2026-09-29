export const TRIP_ID = "dad-trip";
export const DEFAULT_MEMBERS = ["Venu", "Brahmam", "SVR", "Ravi", "PLR"];

export const tripDocumentPath = ["trips", TRIP_ID];
export const expensesCollectionPath = [...tripDocumentPath, "expenses"];

export function getMembers(trip) {
  const configuredMembers = trip?.members
    ?.map((member) => member?.trim())
    .filter(Boolean);

  return configuredMembers?.length
    ? [...new Set(configuredMembers)]
    : DEFAULT_MEMBERS;
}

export function toCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function formatINR(cents) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
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
  return date
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date)
    : "Pending";
}

export function calculateTripSummary(expenses, members) {
  const spentCents = Object.fromEntries(members.map((member) => [member, 0]));
  const shareCents = Object.fromEntries(members.map((member) => [member, 0]));
  let totalCents = 0;

  expenses.forEach((expense) => {
    const amountCents = toCents(expense.amount);
    const splitAmong = [
      ...new Set(
        (Array.isArray(expense.splitAmong) ? expense.splitAmong : []).filter(
          (member) => members.includes(member),
        ),
      ),
    ];

    if (amountCents <= 0 || !members.includes(expense.paidBy) || !splitAmong.length) {
      return;
    }

    totalCents += amountCents;
    spentCents[expense.paidBy] += amountCents;

    const sharePerPerson = Math.floor(amountCents / splitAmong.length);
    const remainder = amountCents % splitAmong.length;
    splitAmong.forEach((member, index) => {
      shareCents[member] += sharePerPerson + (index < remainder ? 1 : 0);
    });
  });

  const balanceCents = Object.fromEntries(
    members.map((member) => [member, spentCents[member] - shareCents[member]]),
  );

  const debtors = members
    .filter((member) => balanceCents[member] < 0)
    .map((name) => ({ name, amountCents: Math.abs(balanceCents[name]) }));
  const creditors = members
    .filter((member) => balanceCents[member] > 0)
    .map((name) => ({ name, amountCents: balanceCents[name] }));
  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.amountCents, creditor.amountCents);

    settlements.push({ from: debtor.name, to: creditor.name, amountCents });
    debtor.amountCents -= amountCents;
    creditor.amountCents -= amountCents;

    if (debtor.amountCents === 0) debtorIndex += 1;
    if (creditor.amountCents === 0) creditorIndex += 1;
  }

  return { totalCents, spentCents, shareCents, balanceCents, settlements };
}
