import {
  formatExpenseDate,
  getExpenseAmountPaise,
  getExpensePersonIds,
  getExpenseShares,
  resolvePersonId,
} from "./trip.js";

function groupIndianDigits(digits) {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const remaining = digits.slice(0, -3);
  return `${remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${lastThree}`;
}

export function paiseToDecimal(paise) {
  const safePaise = Number.isInteger(paise) ? paise : 0;
  const absolute = Math.abs(safePaise);
  const whole = String(Math.floor(absolute / 100));
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${safePaise < 0 ? "-" : ""}${whole}.${fraction}`;
}

export function formatExportINR(paise) {
  const safePaise = Number.isInteger(paise) ? paise : 0;
  const absolute = Math.abs(safePaise);
  const whole = groupIndianDigits(String(Math.floor(absolute / 100)));
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${safePaise < 0 ? "-" : ""}₹${whole}.${fraction}`;
}

function formatPdfINR(paise) {
  return formatExportINR(paise).replace("₹", "INR ");
}

function localDateStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function personName(reference, peopleById, people) {
  const personId = resolvePersonId(reference, people);
  return peopleById[personId]?.name ?? String(reference ?? "Unknown person");
}

function buildShareRows(expense, people, peopleById) {
  const participantIds = getExpensePersonIds(expense, people);
  const shares = getExpenseShares(expense, people) ?? {};
  const splitType = expense.splitType ?? "equal";

  return participantIds.map((personId) => ({
    name: peopleById[personId]?.name ?? "Unknown person",
    amountPaise: shares[personId] ?? 0,
    percentageBps: splitType === "percentage" ? expense.percentageBps?.[personId] ?? 0 : null,
  }));
}

function shareDetails(shareRows) {
  return shareRows.map((share) => {
    const amount = formatExportINR(share.amountPaise);
    if (share.percentageBps !== null) {
      return `${share.name}: ${(share.percentageBps / 100).toFixed(2)}% (${amount})`;
    }
    return `${share.name}: ${amount}`;
  }).join("; ");
}

function buildExpenseRow(expense, people, peopleById) {
  const participantIds = getExpensePersonIds(expense, people);
  const shareRows = buildShareRows(expense, people, peopleById);
  return {
    description: expense.notes?.trim() || "Expense",
    date: formatExpenseDate(expense),
    amountPaise: getExpenseAmountPaise(expense),
    paidBy: personName(expense.paidBy, peopleById, people),
    splitType: expense.splitType ?? "equal",
    participants: participantIds.map((personId) => peopleById[personId]?.name ?? "Unknown person").join(", "),
    shareRows,
    shareDetails: shareDetails(shareRows),
  };
}

export function buildTripExport({ people, expenses, summary, exportedAt = new Date() }) {
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));
  const peopleRows = people.map((person) => ({
    name: person.name,
    totalPaidPaise: summary.paidPaise[person.id] ?? 0,
    totalOwedPaise: summary.owedPaise[person.id] ?? 0,
    balancePaise: summary.balancePaise[person.id] ?? 0,
  }));
  const expenseRows = expenses.map((expense) => buildExpenseRow(expense, people, peopleById));
  const settlementRows = summary.settlements.map((settlement) => ({
    from: peopleById[settlement.fromId]?.name ?? "Unknown person",
    to: peopleById[settlement.toId]?.name ?? "Unknown person",
    amountPaise: settlement.amountPaise,
  }));

  return {
    exportedAt,
    fileDate: localDateStamp(exportedAt),
    totalPaise: summary.totalPaise,
    participantCount: people.length,
    expenseCount: expenses.length,
    peopleRows,
    expenseRows,
    settlementRows,
  };
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildTripCsv(data) {
  const rows = [["recordType", "name", "totalPaid", "totalOwed", "balance", "description", "date", "amount", "paidBy", "splitType", "participants", "shareDetails", "from", "to", "settlementAmount"]];
  rows.push(["summary", "Dad's Trip", "", "", "", "", data.exportedAt.toLocaleString("en-IN"), paiseToDecimal(data.totalPaise), "", "", "", "", "", "", ""]);
  data.peopleRows.forEach((person) => rows.push(["person", person.name, paiseToDecimal(person.totalPaidPaise), paiseToDecimal(person.totalOwedPaise), paiseToDecimal(person.balancePaise), "", "", "", "", "", "", "", "", "", ""]));
  data.expenseRows.forEach((expense) => rows.push(["expense", "", "", "", "", expense.description, expense.date, paiseToDecimal(expense.amountPaise), expense.paidBy, expense.splitType, expense.participants, expense.shareDetails, "", "", ""]));
  data.settlementRows.forEach((settlement) => rows.push(["settlement", "", "", "", "", "", "", "", "", "", "", "", settlement.from, settlement.to, paiseToDecimal(settlement.amountPaise)]));
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadTripCsv(data) {
  downloadBlob(new Blob([buildTripCsv(data)], { type: "text/csv;charset=utf-8" }), `dads-trip-data-${data.fileDate}.csv`);
}

export async function downloadTripPdf(data) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 44;
  const width = pageWidth - margin * 2;
  const top = 48;
  const bottom = pageHeight - 42;
  const colors = { ink: [30, 41, 59], body: [51, 65, 85], muted: [100, 116, 139], rule: [203, 213, 225], soft: [241, 245, 249], card: [248, 250, 252], white: [255, 255, 255] };
  let y = top;

  function newPage() {
    pdf.addPage();
    y = top;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.muted);
    pdf.text("Dad's Trip", margin, y);
    pdf.setDrawColor(...colors.rule);
    pdf.line(margin, y + 8, pageWidth - margin, y + 8);
    y += 24;
  }
  function ensureSpace(height) {
    if (y + height <= bottom) return;
    newPage();
  }
  function setText(size, color = colors.body, style = "normal") {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  }
  function sectionTitle(value) {
    ensureSpace(34);
    setText(13, colors.ink, "bold");
    pdf.text(value, margin, y);
    y += 8;
    pdf.setDrawColor(...colors.rule);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 15;
  }
  function paragraph(value, options = {}) {
    const { size = 10, color = colors.body, widthOverride = width, gap = 7, style = "normal" } = options;
    setText(size, color, style);
    const lines = pdf.splitTextToSize(String(value), widthOverride);
    ensureSpace(lines.length * (size + 3) + gap);
    pdf.text(lines, margin, y);
    y += lines.length * (size + 3) + gap;
  }
  function drawTable(headers, rows, columns, emphasis = false) {
    const headerHeight = 21;
    const lineHeight = 12;
    function drawHeader() {
      ensureSpace(headerHeight + 4);
      pdf.setFillColor(...(emphasis ? colors.ink : colors.soft));
      pdf.rect(margin, y, width, headerHeight, "F");
      let x = margin;
      headers.forEach((header, index) => {
        setText(8, emphasis ? colors.white : colors.body, "bold");
        pdf.text(header, columns[index].align === "right" ? x + columns[index].width - 7 : x + 7, y + 14, { align: columns[index].align ?? "left" });
        x += columns[index].width;
      });
      y += headerHeight;
    }
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const cells = columns.map((column) => pdf.splitTextToSize(String(row[column.key] ?? ""), column.width - 14));
      const rowHeight = Math.max(...cells.map((lines) => lines.length)) * lineHeight + 12;
      if (y + rowHeight > bottom) {
        newPage();
        drawHeader();
      }
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(...colors.card);
        pdf.rect(margin, y, width, rowHeight, "F");
      }
      let x = margin;
      cells.forEach((lines, index) => {
        const column = columns[index];
        setText(9, colors.body, column.bold ? "bold" : "normal");
        lines.forEach((line, lineIndex) => pdf.text(line, column.align === "right" ? x + column.width - 7 : x + 7, y + 14 + lineIndex * lineHeight, { align: column.align ?? "left" }));
        x += column.width;
      });
      pdf.setDrawColor(...colors.rule);
      pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
      y += rowHeight;
    });
    y += 13;
  }
  function drawExpenseCard(expense) {
    setText(9);
    const participantLines = pdf.splitTextToSize(expense.participants || "None", width - 30);
    const shareHeight = Math.max(1, expense.shareRows.length) * 18 + 28;
    const estimatedHeight = 94 + participantLines.length * 12 + shareHeight;
    ensureSpace(Math.min(estimatedHeight, 250));
    const cardTop = y;
    pdf.setFillColor(...colors.card);
    pdf.roundedRect(margin, cardTop, width, estimatedHeight, 5, 5, "F");
    pdf.setDrawColor(...colors.rule);
    pdf.roundedRect(margin, cardTop, width, estimatedHeight, 5, 5, "S");
    y += 20;
    setText(11, colors.ink, "bold");
    const titleLines = pdf.splitTextToSize(expense.description, width - 160);
    pdf.text(titleLines, margin + 12, y);
    setText(11, colors.ink, "bold");
    pdf.text(formatPdfINR(expense.amountPaise), pageWidth - margin - 12, y, { align: "right" });
    y += Math.max(titleLines.length * 13, 16) + 5;
    setText(9, colors.body);
    pdf.text(`Date: ${expense.date}`, margin + 12, y);
    pdf.text(`Paid by: ${expense.paidBy}`, margin + width / 2, y);
    y += 15;
    pdf.text(`Split type: ${expense.splitType}`, margin + 12, y);
    y += 16;
    setText(8, colors.muted, "bold");
    pdf.text("PARTICIPANTS", margin + 12, y);
    y += 12;
    setText(9, colors.body);
    pdf.text(participantLines, margin + 12, y);
    y += participantLines.length * 12 + 9;
    pdf.setFillColor(...colors.white);
    pdf.rect(margin + 12, y, width - 24, 18, "F");
    setText(8, colors.body, "bold");
    pdf.text("PERSON", margin + 18, y + 12);
    pdf.text("SHARE", pageWidth - margin - 18, y + 12, { align: "right" });
    y += 18;
    expense.shareRows.forEach((share, index) => {
      if (index % 2 === 1) {
        pdf.setFillColor(...colors.white);
        pdf.rect(margin + 12, y, width - 24, 18, "F");
      }
      setText(9, colors.body);
      const detail = share.percentageBps === null ? share.name : `${share.name} (${(share.percentageBps / 100).toFixed(2)}%)`;
      pdf.text(detail, margin + 18, y + 12);
      pdf.text(formatPdfINR(share.amountPaise), pageWidth - margin - 18, y + 12, { align: "right" });
      y += 18;
    });
    y = cardTop + estimatedHeight + 14;
  }

  pdf.setProperties({ title: "Dad's Trip report", subject: "Trip expense summary" });
  setText(24, colors.ink, "bold");
  pdf.text("Dad's Trip", margin, y);
  y += 17;
  paragraph(`Trip expense report | Exported ${data.exportedAt.toLocaleString("en-IN")}`, { size: 9, color: colors.muted, gap: 9 });
  pdf.setFillColor(...colors.soft);
  pdf.roundedRect(margin, y, width, 34, 4, 4, "F");
  setText(9, colors.body, "bold");
  pdf.text(`${data.participantCount} participant${data.participantCount === 1 ? "" : "s"}`, margin + 12, y + 21);
  pdf.text(`${data.expenseCount} expense${data.expenseCount === 1 ? "" : "s"}`, margin + width / 2, y + 21, { align: "center" });
  pdf.text(`Total spending: ${formatPdfINR(data.totalPaise)}`, pageWidth - margin - 12, y + 21, { align: "right" });
  y += 52;

  sectionTitle("Participants and balances");
  if (!data.peopleRows.length) paragraph("No participants have been added.", { color: colors.muted });
  else drawTable(["NAME", "PAID", "SHARE", "BALANCE"], data.peopleRows.map((person) => ({ name: person.name, paid: formatPdfINR(person.totalPaidPaise), owed: formatPdfINR(person.totalOwedPaise), balance: `${person.balancePaise >= 0 ? "+" : "-"}${formatPdfINR(Math.abs(person.balancePaise))}` })), [{ key: "name", width: width * 0.34, bold: true }, { key: "paid", width: width * 0.22, align: "right" }, { key: "owed", width: width * 0.22, align: "right" }, { key: "balance", width: width * 0.22, align: "right", bold: true }]);

  sectionTitle("Expenses");
  if (!data.expenseRows.length) paragraph("No expenses have been recorded.", { color: colors.muted });
  else data.expenseRows.forEach(drawExpenseCard);

  sectionTitle("Final settlement");
  if (!data.settlementRows.length) {
    pdf.setFillColor(...colors.soft);
    pdf.roundedRect(margin, y, width, 34, 4, 4, "F");
    setText(10, colors.body, "bold");
    pdf.text("No settlement is required.", margin + 12, y + 21);
    y += 47;
  } else {
    drawTable(["FROM", "TO", "AMOUNT"], data.settlementRows.map((settlement) => ({ from: settlement.from, to: settlement.to, amount: formatPdfINR(settlement.amountPaise) })), [{ key: "from", width: width * 0.38, bold: true }, { key: "to", width: width * 0.38, bold: true }, { key: "amount", width: width * 0.24, align: "right", bold: true }], true);
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    setText(8, colors.muted);
    pdf.text(`Dad's Trip | Page ${page} of ${pageCount}`, margin, pageHeight - 20);
  }
  pdf.save(`dads-trip-report-${data.fileDate}.pdf`);
}
