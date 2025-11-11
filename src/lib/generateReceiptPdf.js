// src/lib/generateReceiptPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Number to Words (Indian Rupees)
function numberToWords(num) {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (num === 0) return "Zero";

    function belowThousand(n) {
        if (n === 0) return "";
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + belowThousand(n % 100) : "");
    }

    let words = "";
    if (num >= 10000000) {
        words += belowThousand(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
    }
    if (num >= 100000) {
        words += belowThousand(Math.floor(num / 100000)) + " Lakh ";
        num %= 100000;
    }
    if (num >= 1000) {
        words += belowThousand(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
    }
    words += belowThousand(num);
    return words.trim();
}

export async function generateReceiptPdf(data) {
    const {
        school,
        receiptNumber,
        studentName,
        admissionNo,
        className,
        paymentDate,
        amount,
        paymentMethod,
        academicYear,
        installments = [],
    } = data;

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ============ CLEAN WHITE BACKGROUND ============
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // ============ PREMIUM HEADER ============
    // Main header background - Deep Professional Blue
    doc.setFillColor(30, 58, 138); // Blue 900
    doc.rect(0, 0, pageWidth, 65, "F");
    
    // Top accent stripe
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, pageWidth, 2, "F");
    
    // Bottom accent stripe
    doc.setFillColor(139, 92, 246); // Purple 500
    doc.rect(0, 63, pageWidth, 2, "F");

    // ============ LOGOS SECTION ============
    // School Logo (Left) - Larger and better positioned
    if (school.logo) {
        try {
            doc.addImage(school.logo, "PNG", 10, 8, 25, 25);
        } catch (e) {
            console.log("School logo failed to load");
        }
    }

    // EduBreezy Logo (Right) - Use base64 or direct URL
    // IMPORTANT: Provide edubreezyLogoBase64 in school object for reliability
    const edubreezyLogo = school.edubreezyLogoBase64 || school.edubreezyLogo;
    if (edubreezyLogo) {
        try {
            doc.addImage(edubreezyLogo, "PNG", pageWidth - 35, 8, 25, 25);
        } catch (e) {
            // Fallback: Draw "EB" text if logo fails
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text("EB", pageWidth - 22, 22);
        }
    }

    // ============ HEADER TEXT - Better Spacing ============
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(school.name || "Your School", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(226, 232, 240); // Light gray
    doc.text(school.address || "Address", pageWidth / 2, 22, { align: "center" });
    
    // Contact info - well spaced
    doc.setFontSize(7);
    let contactY = 28;
    if (school.phone) {
        doc.text(`Ph: ${school.phone}`, pageWidth / 2, contactY, { align: "center" });
        contactY += 4;
    }
    if (school.email) {
        doc.text(`Email: ${school.email}`, pageWidth / 2, contactY, { align: "center" });
    }

    // Receipt Title Badge
    doc.setFillColor(79, 70, 229); // Indigo
    doc.roundedRect(pageWidth / 2 - 30, 40, 60, 16, 3, 3, "F");
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("FEE RECEIPT", pageWidth / 2, 50, { align: "center" });

    // ============ RECEIPT INFO CARD - Better Layout ============
    const cardY = 72;
    
    // White card with border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, cardY, pageWidth - 20, 30, 2, 2, "F");
    
    doc.setDrawColor(229, 231, 235); // Gray border
    doc.setLineWidth(0.3);
    doc.roundedRect(10, cardY, pageWidth - 20, 30, 2, 2, "S");
    
    // Left accent
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(10, cardY, 2, 30, 1, 1, "F");

    // Grid layout for receipt info
    const infoStartX = 15;
    const infoStartY = cardY + 6;
    const colWidth = (pageWidth - 30) / 2;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128); // Gray 500
    
    // Column 1
    doc.text("Receipt No.", infoStartX, infoStartY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39); // Gray 900
    doc.setFontSize(10);
    doc.text(receiptNumber, infoStartX, infoStartY + 5);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("Date", infoStartX, infoStartY + 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text(format(paymentDate, "dd MMM yyyy"), infoStartX, infoStartY + 17);
    
    // Column 2
    const col2X = infoStartX + colWidth;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("Payment Mode", col2X, infoStartY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text(paymentMethod, col2X, infoStartY + 5);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("Academic Year", col2X, infoStartY + 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text(academicYear, col2X, infoStartY + 17);

    // ============ STUDENT DETAILS SECTION ============
    let currentY = 110;
    
    // Section header
    doc.setFillColor(243, 244, 246); // Gray 100
    doc.roundedRect(10, currentY, pageWidth - 20, 8, 1, 1, "F");
    
    doc.setFillColor(79, 70, 229); // Indigo accent bar
    doc.rect(10, currentY, 3, 8, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); // Blue 900
    doc.text("STUDENT DETAILS", 16, currentY + 5.5);

    // Student table
    autoTable(doc, {
        startY: currentY + 10,
        theme: "plain",
        head: [["Field", "Details"]],
        body: [
            ["Name", studentName],
            ["Admission No.", admissionNo],
            ["Class", className],
        ],
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [30, 58, 138], // Blue 900
            textColor: 255,
            fontSize: 9,
            fontStyle: "bold",
        },
        columnStyles: {
            0: { 
                fillColor: [249, 250, 251], 
                fontStyle: "bold", 
                textColor: [75, 85, 99],
                cellWidth: 35
            },
            1: { 
                fillColor: [255, 255, 255], 
                textColor: [17, 24, 39]
            }
        },
    });

    // ============ PAYMENT DETAILS SECTION ============
    currentY = doc.lastAutoTable.finalY + 10;
    
    // Section header
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(10, currentY, pageWidth - 20, 8, 1, 1, "F");
    
    doc.setFillColor(139, 92, 246); // Purple accent
    doc.rect(10, currentY, 3, 8, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("PAYMENT DETAILS", 16, currentY + 5.5);

    // Payment table
    const tableBody = installments.map(inst => [
        `Installment ${inst.number}`,
        `₹${inst.amount.toFixed(2)}`
    ]);

    tableBody.push([
        { content: "TOTAL AMOUNT PAID", fontStyle: "bold" },
        { content: `₹${amount.toFixed(2)}`, fontStyle: "bold" }
    ]);

    autoTable(doc, {
        startY: currentY + 10,
        theme: "plain",
        head: [["Description", "Amount"]],
        body: tableBody,
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [30, 58, 138], // Blue 900
            textColor: 255,
            fontSize: 9,
            fontStyle: "bold"
        },
        columnStyles: {
            0: { 
                halign: "left", 
                textColor: [17, 24, 39],
                fillColor: [255, 255, 255]
            },
            1: { 
                halign: "right", 
                textColor: [17, 24, 39], 
                fontStyle: "bold",
                fillColor: [255, 255, 255]
            }
        },
        foot: [[
            { content: "Amount in Words:", fontStyle: "bold", textColor: [0, 0, 0] },
            { content: `${numberToWords(Math.round(amount))} Rupees Only`, fontStyle: "italic", textColor: [0, 0, 0] }
        ]],
        footStyles: {
            fillColor: [240, 253, 244], // Green 50
            fontSize: 8,
        },
    });

    // ============ FOOTER ============
    currentY = doc.lastAutoTable.finalY + 8;
    
    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(10, currentY, pageWidth - 10, currentY);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your payment!", 10, currentY + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("This is a computer-generated receipt.", 10, currentY + 9);

    // Signature
    doc.setTextColor(75, 85, 99);
    doc.text("Authorized Signature", pageWidth - 10, currentY + 5, { align: "right" });
    doc.line(pageWidth - 45, currentY + 7, pageWidth - 10, currentY + 7);

    // ============ POWERED BY FOOTER ============
    const footerY = pageHeight - 12;
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(10, footerY, pageWidth - 20, 8, 2, 2, "F");
    
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "normal");
    doc.text("Powered by", pageWidth / 2 - 12, footerY + 5);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("EduBreezy ERP", pageWidth / 2 + 5, footerY + 5);

    return doc.output("arraybuffer");
}