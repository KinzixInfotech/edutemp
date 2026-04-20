import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { getReceiptPaperConfig, normalizeReceiptPaperSize } from "@/lib/receipts/receipt-format";

function numberToWords(num) {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (!num) return "Zero";

    const belowThousand = (n) => {
        if (n === 0) return "";
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
        return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${belowThousand(n % 100)}` : ""}`;
    };

    let n = Math.floor(num);
    let words = "";
    if (n >= 10000000) {
        words += `${belowThousand(Math.floor(n / 10000000))} Crore `;
        n %= 10000000;
    }
    if (n >= 100000) {
        words += `${belowThousand(Math.floor(n / 100000))} Lakh `;
        n %= 100000;
    }
    if (n >= 1000) {
        words += `${belowThousand(Math.floor(n / 1000))} Thousand `;
        n %= 1000;
    }
    words += belowThousand(n);
    return words.trim();
}

export async function generateReceiptPdf(data) {
    const {
        school = {},
        receiptNumber,
        studentName,
        fatherName = "",
        admissionNo,
        className,
        paymentDate,
        amount,
        paymentMethod,
        academicYear,
        installments = [],
        remarks = "",
        receiptSettings = {},
    } = data;

    const normalizedPaperSize = normalizeReceiptPaperSize(receiptSettings.receiptPaperSize);
    const paperConfig = getReceiptPaperConfig(normalizedPaperSize);
    const isThermal = paperConfig.value === "thermal";
    const showSchoolLogo = receiptSettings.showSchoolLogo ?? true;
    const showPaymentMode = receiptSettings.showPaymentMode ?? true;
    const showSignatureLine = receiptSettings.showSignatureLine ?? true;
    const showBalanceDue = receiptSettings.showBalanceDue ?? true;
    const footerText = receiptSettings.receiptFooterText || "";
    const totalAmount = Number(amount || 0);
    const rows = (installments || []).length
        ? installments.map((item) => [
            `# ${String(item.label || item.name || `Installment ${item.number || ""}`).trim().toUpperCase()}`,
            "0.0",
            Number(item.amount || 0).toFixed(1),
        ])
        : [["# FEE PAYMENT", "0.0", totalAmount.toFixed(1)]];

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: isThermal ? [paperConfig.widthMm, 240] : [paperConfig.widthMm, paperConfig.heightMm],
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = isThermal ? 6 : 12;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

    if (showSchoolLogo && school.logo) {
        try {
            doc.addImage(school.logo, "PNG", pageWidth / 2 - 10, cursorY, 20, 20);
            cursorY += 24;
        } catch (error) {
            // Best effort logo rendering.
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isThermal ? 13 : 16);
    doc.text(school.name || "School Name", pageWidth / 2, cursorY, { align: "center" });
    cursorY += isThermal ? 5 : 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(isThermal ? 8.5 : 10);
    if (school.address) {
        doc.text(String(school.address), pageWidth / 2, cursorY, { align: "center", maxWidth: pageWidth - 20 });
        cursorY += isThermal ? 4 : 5;
    }
    if (school.phone) {
        doc.text(`Phone: ${school.phone}`, pageWidth / 2, cursorY, { align: "center" });
        cursorY += isThermal ? 4 : 5;
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(8, cursorY, pageWidth - 8, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isThermal ? 11 : 13);
    doc.text("FEE RECEIPT", 8, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(isThermal ? 8 : 9);
    doc.text("Student's Copy", pageWidth - 8, cursorY, { align: "right" });
    cursorY += 6;

    const infoRows = [
        ["RcptNo", `: ${receiptNumber}`],
        ["Admn No", `: ${admissionNo || "N/A"}`],
        ["Name", `: ${studentName || "Student"}`],
        ["Date", `: ${paymentDate ? format(new Date(paymentDate), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")}`],
        ["F.Name", `: ${fatherName || "N/A"}`],
        ["Session", `: ${academicYear || "N/A"}`],
        ["Month", `: ${remarks || "Current"}`],
        ["Class", `: ${className || "N/A"}`],
    ];

    autoTable(doc, {
        startY: cursorY,
        theme: "plain",
        body: infoRows,
        styles: {
            fontSize: isThermal ? 8 : 9,
            cellPadding: isThermal ? 0.8 : 1.4,
            textColor: [17, 24, 39],
        },
        columnStyles: {
            0: { cellWidth: isThermal ? 18 : 26, fontStyle: "normal", textColor: [75, 85, 99] },
            1: { cellWidth: "auto" },
        },
        margin: { left: 8, right: 8 },
    });

    cursorY = doc.lastAutoTable.finalY + 3;

    autoTable(doc, {
        startY: cursorY,
        theme: "grid",
        head: [["Head Name", "Dues", "Amt"]],
        body: rows,
        styles: {
            fontSize: isThermal ? 8 : 9,
            cellPadding: isThermal ? 1.2 : 2,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [17, 24, 39],
            fontStyle: "bold",
        },
        bodyStyles: { textColor: [15, 23, 42] },
        columnStyles: {
            0: { cellWidth: isThermal ? 34 : 88 },
            1: { halign: "right", cellWidth: isThermal ? 14 : 28 },
            2: { halign: "right", cellWidth: isThermal ? 16 : 30 },
        },
        margin: { left: 8, right: 8 },
    });

    cursorY = doc.lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(isThermal ? 8 : 9);
    doc.text(`Collected By: SYSTEM`, 8, cursorY);
    cursorY += 4;
    doc.text(`Time: ${format(new Date(paymentDate || new Date()), "HH:mm")}`, 8, cursorY);
    if (showPaymentMode) {
        cursorY += 4;
        doc.text(`PayMode: By ${paymentMethod || "OFFLINE"}`, 8, cursorY);
    }

    const summaryX = pageWidth - (isThermal ? 34 : 58);
    const summaryRows = [
        ["Fee Total", totalAmount],
        ["Grand Total", totalAmount],
        ["Payable Amt", totalAmount],
        ["Paid Amt", totalAmount],
        ...(showBalanceDue ? [["Curr. Dues", 0]] : []),
    ];

    let summaryY = doc.lastAutoTable.finalY + 5;
    summaryRows.forEach(([label, value]) => {
        doc.text(`${label}`, summaryX, summaryY);
        doc.text(`: ${Number(value).toFixed(1)}`, pageWidth - 8, summaryY, { align: "right" });
        summaryY += 4;
    });

    cursorY = Math.max(cursorY + 8, summaryY + 2);
    doc.setLineDashPattern([], 0);
    doc.line(8, cursorY, pageWidth - 8, cursorY);
    cursorY += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isThermal ? 8 : 9);
    doc.text(`Amount In Word: ${numberToWords(totalAmount)} Only`, 8, cursorY, {
        maxWidth: pageWidth - 16,
    });

    if (showSignatureLine) {
        cursorY += isThermal ? 18 : 24;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(isThermal ? 8 : 9);
        doc.line(8, cursorY, 8 + (pageWidth - 24) / 2, cursorY);
        doc.line(pageWidth - 8 - (pageWidth - 24) / 2, cursorY, pageWidth - 8, cursorY);
        doc.text("Cashier Sign", 8 + (pageWidth - 24) / 4, cursorY + 4, { align: "center" });
        doc.text("Depositor Sign", pageWidth - 8 - (pageWidth - 24) / 4, cursorY + 4, { align: "center" });
        cursorY += 10;
    }

    if (footerText) {
        cursorY += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(isThermal ? 7.5 : 8.5);
        doc.text(String(footerText), pageWidth / 2, cursorY, {
            align: "center",
            maxWidth: pageWidth - 16,
        });
    }

    return Buffer.from(doc.output("arraybuffer"));
}
