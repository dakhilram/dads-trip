import assert from "node:assert/strict";
import test from "node:test";
import { buildTripCsv, buildTripExport, formatExportINR, paiseToDecimal } from "../src/lib/exportTrip.js";
import { calculateTripSummary, getExpenseShares, getLegacyNames, getExpensePersonIds, isPersonReferenced, resolvePersonId, validateExpenseSplit } from "../src/lib/trip.js";

const people = [
  { id: "dad", name: "Dad", legacyNames: [] },
  { id: "akhil", name: "Akhil", legacyNames: [] },
  { id: "ravi", name: "Ravi Kumar", legacyNames: ["Ravi"] },
  { id: "kiran", name: "Kiran", legacyNames: [] },
  { id: "mahesh", name: "Mahesh", legacyNames: ["Suresh"] },
];

const expenses = [
  { notes: "Hotel", date: "2026-09-28T10:00:00.000Z", amountPaise: 1250000, paidBy: "dad", participants: ["dad", "akhil", "ravi", "kiran", "mahesh"], splitType: "equal" },
  { notes: "Fuel", date: "2026-09-28T11:00:00.000Z", amountPaise: 420000, paidBy: "akhil", participants: ["dad", "akhil", "ravi", "kiran"], splitType: "equal" },
  { notes: "Breakfast", date: "2026-09-28T12:00:00.000Z", amountPaise: 185000, paidBy: "ravi", participants: ["dad", "akhil", "ravi", "kiran", "mahesh"], splitType: "exact", exactAmountsPaise: { dad: 40000, akhil: 40000, ravi: 35000, kiran: 35000, mahesh: 35000 } },
  { notes: "Temple / Parking", date: "2026-09-28T13:00:00.000Z", amountPaise: 100000, paidBy: "kiran", participants: ["dad", "akhil", "ravi", "kiran", "mahesh"], splitType: "percentage", percentageBps: { dad: 3000, akhil: 2500, ravi: 2000, kiran: 1500, mahesh: 1000 } },
  { notes: "Dinner", date: "2026-09-28T14:00:00.000Z", amountPaise: 337500, paidBy: "dad", participants: ["dad", "akhil", "ravi"], splitType: "equal" },
];

test("synthetic trip report and CSV preserve paise-exact balances", () => {
  const summary = calculateTripSummary(expenses, people);
  const report = buildTripExport({ people, expenses, summary, exportedAt: new Date("2026-09-28T16:30:00Z") });
  const rowsByName = Object.fromEntries(report.peopleRows.map((row) => [row.name, row]));

  assert.deepEqual(rowsByName.Dad, { name: "Dad", totalPaidPaise: 1587500, totalOwedPaise: 537500, balancePaise: 1050000 });
  assert.deepEqual(rowsByName.Akhil, { name: "Akhil", totalPaidPaise: 420000, totalOwedPaise: 532500, balancePaise: -112500 });
  assert.deepEqual(rowsByName["Ravi Kumar"], { name: "Ravi Kumar", totalPaidPaise: 185000, totalOwedPaise: 522500, balancePaise: -337500 });
  assert.equal(report.totalPaise, 2292500);
  assert.equal(report.settlementRows.reduce((total, settlement) => total + settlement.amountPaise, 0), 1050000);
  assert.match(report.expenseRows[2].shareDetails, /Ravi Kumar: ₹350.00/);
  assert.match(report.expenseRows[3].shareDetails, /Dad: 30.00% \(₹300.00\)/);

  const csv = buildTripCsv(report);
  assert.ok(csv.startsWith("\uFEFFrecordType"));
  assert.match(csv, /10500.00/);
  assert.match(csv, /Akhil,Dad,1125.00/);
  assert.equal(formatExportINR(12347), "₹123.47");
  assert.equal(paiseToDecimal(-1), "-0.01");
});

test("split validation and uneven paise allocation remain exact", () => {
  const splitExpense = { amountPaise: 100, paidBy: "dad", participants: ["dad", "akhil", "ravi"], splitType: "equal" };
  assert.deepEqual(Object.values(getExpenseShares(splitExpense, people)), [34, 33, 33]);
  assert.notEqual(validateExpenseSplit(10000, ["dad"], "exact", { dad: "99.99" }, {}), "");
  assert.notEqual(validateExpenseSplit(10000, ["dad"], "percentage", {}, { dad: "99" }), "");
  assert.equal(validateExpenseSplit(10000, ["dad"], "percentage", {}, { dad: "100" }), "");
});

test("legacy names, rename compatibility, person deletion guard, and recalculation remain correct", () => {
  const legacyExpense = { amount: 1000, paidBy: "Ravi", splitAmong: ["Ravi", "Dad"] };
  const temporaryPerson = { id: "test-person", name: "Test Person", legacyNames: [] };
  const fuelAfterEdit = { ...expenses[1], amountPaise: 500000 };
  const afterDelete = calculateTripSummary([expenses[0], fuelAfterEdit, expenses[3], expenses[4]], people);

  assert.equal(resolvePersonId("Ravi", people), "ravi");
  assert.deepEqual(getExpensePersonIds(legacyExpense, people), ["ravi", "dad"]);
  assert.ok(isPersonReferenced(people[2], [legacyExpense]));
  assert.equal(isPersonReferenced(temporaryPerson, expenses), false);
  assert.ok(getLegacyNames(null, [legacyExpense]).includes("Ravi"));
  assert.deepEqual(getLegacyNames(null, [expenses[0]]), []);
  assert.equal(afterDelete.balancePaise.dad, 1070000);
  assert.equal(afterDelete.balancePaise.akhil, -12500);
  assert.equal(afterDelete.balancePaise.ravi, -507500);
  assert.equal(afterDelete.balancePaise.kiran, -290000);
  assert.equal(afterDelete.balancePaise.mahesh, -260000);
  assert.equal(Object.values(afterDelete.balancePaise).reduce((sum, amount) => sum + amount, 0), 0);
});


test("recorded payback reduces balances without increasing trip spending", () => {
  const paybackPeople = [
    { id: "venu", name: "Venu", legacyNames: [] },
    { id: "ram", name: "Ram", legacyNames: [] },
  ];
  const tripExpenses = [
    {
      notes: "Trip costs",
      amountPaise: 2500000,
      paidBy: "venu",
      participants: ["venu", "ram"],
      splitType: "exact",
      exactAmountsPaise: { venu: 2070000, ram: 430000 },
    },
  ];
  const paybacks = [
    { id: "payment-1", recordType: "settlement", fromId: "ram", toId: "venu", amountPaise: 330000 },
  ];

  const before = calculateTripSummary(tripExpenses, paybackPeople);
  const after = calculateTripSummary(tripExpenses, paybackPeople, paybacks);

  assert.equal(before.totalPaise, 2500000);
  assert.equal(after.totalPaise, 2500000);
  assert.equal(after.paidPaise.venu, 2500000);
  assert.equal(after.owedPaise.venu, 2070000);
  assert.equal(after.balancePaise.venu, 100000);
  assert.equal(after.balancePaise.ram, -100000);
  assert.equal(after.settlements.length, 1);
  assert.deepEqual(after.settlements[0], { fromId: "ram", toId: "venu", amountPaise: 100000 });
  assert.equal(Object.values(after.balancePaise).reduce((sum, amount) => sum + amount, 0), 0);

  const report = buildTripExport({ people: paybackPeople, expenses: tripExpenses, summary: after, exportedAt: new Date("2026-10-17T12:00:00Z") });
  assert.equal(report.totalPaise, 2500000);
  assert.equal(report.expenseCount, 1);
  assert.equal(report.recordedPaymentRows.length, 1);
  assert.equal(report.recordedPaymentRows[0].amountPaise, 330000);
  assert.equal(report.settlementRows[0].amountPaise, 100000);

  const csv = buildTripCsv(report);
  assert.match(csv, /recordedPayback/);
  assert.match(csv, /3300\.00/);
  assert.match(csv, /remainingSettlement/);
  assert.match(csv, /1000\.00/);
});

test("legacy expense document explicitly marked as settlement is excluded from spending", () => {
  const paybackPeople = [
    { id: "venu", name: "Venu", legacyNames: [] },
    { id: "ram", name: "Ram", legacyNames: [] },
  ];
  const records = [
    {
      notes: "Trip costs",
      amountPaise: 2500000,
      paidBy: "venu",
      participants: ["venu", "ram"],
      splitType: "exact",
      exactAmountsPaise: { venu: 2070000, ram: 430000 },
    },
    {
      id: "old-payback",
      recordType: "settlement",
      amountPaise: 330000,
      paidBy: "ram",
      fromId: "ram",
      toId: "venu",
      participants: ["venu"],
      splitType: "equal",
    },
  ];

  const summary = calculateTripSummary(records, paybackPeople);
  assert.equal(summary.totalPaise, 2500000);
  assert.equal(summary.balancePaise.venu, 100000);
  assert.equal(summary.balancePaise.ram, -100000);
  assert.equal(summary.recordedPayments.length, 1);

  const report = buildTripExport({ people: paybackPeople, expenses: records, summary, exportedAt: new Date("2026-10-17T12:00:00Z") });
  assert.equal(report.expenseCount, 1);
  assert.equal(report.expenseRows.length, 1);
  assert.equal(report.recordedPaymentRows.length, 1);
});
