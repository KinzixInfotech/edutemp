import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper function to replace template variables with actual data
function replaceVariables(text, data) {
    if (!text) return text;

    let result = text;
    const matches = text.match(/\{\{(\w+)\}\}/g);

    if (matches) {
        matches.forEach(match => {
            const key = match.replace(/[{}]/g, '');
            const value = data[key] || match;
            result = result.replace(match, value);
        });
    }

    return result;
}

// Helper to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// Convert pixels to mm (assuming 96 DPI)
function pxToMm(px) {
    return px * 0.264583;
}

export async function generateAdmitCardPDF({ template, student, exam, customFields = {} }) {
    try {
        const layoutConfig = template.layoutConfig;

        // Check if template uses new element-based system
        if (!layoutConfig.elements) {
            // Fall back to old static generation
            return generateStaticPDF({ template, student, exam, customFields });
        }

        // Create PDF with landscape orientation for admit cards
        const doc = new jsPDF({
            orientation: layoutConfig.orientation || 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Background
        const bgColor = hexToRgb(layoutConfig.backgroundColor || '#FFFFFF');
        doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Prepare data object for variable replacement
        const data = {
            rollNumber: student.rollNumber,
            admissionNo: student.admissionNo,
            studentName: student.name,
            class: student.class?.className || 'N/A',
            dob: student.dob,
            gender: student.gender,
            fatherName: student.FatherName,
            motherName: student.MotherName,
            address: student.Address,
            schoolName: layoutConfig.headerText || 'School Name',
            examCenter: exam?.center || 'Exam Center',
            year: new Date().getFullYear(),
            studentPhoto: student.profilePicture,
            ...customFields,
            // Add exam schedule data if provided
            examDate1: exam?.schedule?.[0]?.date || '',
            paperCode1: exam?.schedule?.[0]?.paperCode || '',
            subject1: exam?.schedule?.[0]?.subject || '',
            opted1: exam?.schedule?.[0]?.opted || '',
            examDate2: exam?.schedule?.[1]?.date || '',
            paperCode2: exam?.schedule?.[1]?.paperCode || '',
            subject2: exam?.schedule?.[1]?.subject || '',
            opted2: exam?.schedule?.[1]?.opted || '',
            examDate3: exam?.schedule?.[2]?.date || '',
            paperCode3: exam?.schedule?.[2]?.paperCode || '',
            subject3: exam?.schedule?.[2]?.subject || '',
            opted3: exam?.schedule?.[2]?.opted || '',
            examDate4: exam?.schedule?.[3]?.date || '',
            paperCode4: exam?.schedule?.[3]?.paperCode || '',
            subject4: exam?.schedule?.[3]?.subject || '',
            opted4: exam?.schedule?.[3]?.opted || '',
        };

        // Render each element
        for (const element of layoutConfig.elements) {
            try {
                await renderElement(doc, element, data, pageWidth, pageHeight);
            } catch (error) {
                console.error(`Error rendering element ${element.id}:`, error);
            }
        }

        // Generate PDF
        const pdfBlob = doc.output('blob');
        const pdfDataUrl = doc.output('dataurlstring');

        return pdfDataUrl;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

async function renderElement(doc, element, data, pageWidth, pageHeight) {
    const x = pxToMm(element.x);
    const y = pxToMm(element.y);
    const width = pxToMm(element.width);
    const height = element.height ? pxToMm(element.height) : undefined;

    switch (element.type) {
        case 'text':
            renderTextElement(doc, element, data, x, y);
            break;

        case 'image':
            await renderImageElement(doc, element, data, x, y, width, height);
            break;

        case 'table':
            renderTableElement(doc, element, data, x, y, width);
            break;
    }
}

function renderTextElement(doc, element, data, x, y) {
    const content = replaceVariables(element.content, data);
    const fontSize = element.fontSize || 14;
    const fontWeight = element.fontWeight === 'bold' ? 'bold' : 'normal';
    const textAlign = element.textAlign || 'left';
    const color = hexToRgb(element.color || '#000000');

    doc.setFontSize(fontSize * 0.75); // Convert px to pt
    doc.setFont('helvetica', fontWeight);
    doc.setTextColor(color.r, color.g, color.b);

    const textOptions = { align: textAlign };

    if (textAlign === 'center') {
        doc.text(content, x + pxToMm(element.width) / 2, y + 5, textOptions);
    } else if (textAlign === 'right') {
        doc.text(content, x + pxToMm(element.width), y + 5, textOptions);
    } else {
        doc.text(content, x, y + 5, textOptions);
    }
}

async function renderImageElement(doc, element, data, x, y, width, height) {
    let imageUrl = element.url;

    // Replace variables in image URL
    imageUrl = replaceVariables(imageUrl, data);

    if (!imageUrl || imageUrl.startsWith('{{')) {
        // No image or unresolved variable
        return;
    }

    try {
        // Add border if specified
        if (element.border) {
            const borderColor = hexToRgb(element.borderColor || '#000000');
            doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
            doc.setLineWidth(element.borderWidth || 0.5);
            doc.rect(x, y, width, height);
        }

        // Add image
        doc.addImage(imageUrl, 'JPEG', x, y, width, height);
    } catch (error) {
        console.error('Error adding image:', error);
        // Draw placeholder rectangle
        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, width, height, 'F');
    }
}

function renderTableElement(doc, element, data, x, y, width) {
    const hasHeaders = element.columns && element.columns.length > 0;
    const rows = element.rows || [];

    // Prepare table data
    const tableData = [];

    if (hasHeaders) {
        // Add header row
        const headerRow = element.columns.map(col => col.label);
        tableData.push(headerRow);
    }

    // Add data rows
    rows.forEach(row => {
        if (Array.isArray(row)) {
            const rowData = row.map(cell => {
                if (typeof cell === 'object') {
                    const value = cell.field || cell.label || '';
                    return replaceVariables(value, data);
                }
                return replaceVariables(cell, data);
            });
            tableData.push(rowData);
        } else if (typeof row === 'object' && row.label) {
            // Old format: {label, field}
            tableData.push([row.label, replaceVariables(row.field, data)]);
        }
    });

    // Calculate column widths
    const columnStyles = {};
    if (element.columns) {
        element.columns.forEach((col, idx) => {
            if (col.width) {
                const widthValue = parseFloat(col.width);
                columnStyles[idx] = {
                    cellWidth: (width * widthValue / 100)
                };
            }
        });
    }

    // Border colors
    const borderColor = hexToRgb(element.borderColor || '#000000');
    const headerBgColor = hexToRgb(element.headerBg || '#f5f5f5');

    // Generate table
    doc.autoTable({
        startY: y,
        head: hasHeaders ? [element.columns.map(col => col.label)] : [],
        body: hasHeaders ? tableData.slice(1) : tableData,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: element.cellPadding ? element.cellPadding * 0.264583 : 2,
            lineColor: [borderColor.r, borderColor.g, borderColor.b],
            lineWidth: element.borderWidth ? element.borderWidth * 0.264583 : 0.1,
        },
        headStyles: {
            fillColor: [headerBgColor.r, headerBgColor.g, headerBgColor.b],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles,
        margin: { left: x },
        tableWidth: width,
        didParseCell: function (data) {
            // Handle colspan
            const rowIndex = data.row.index;
            const colIndex = data.column.index;

            if (element.rows && element.rows[rowIndex]) {
                const row = element.rows[rowIndex];
                if (Array.isArray(row) && row[colIndex] && typeof row[colIndex] === 'object') {
                    const cell = row[colIndex];
                    if (cell.colspan && cell.colspan > 1) {
                        data.cell.colSpan = cell.colspan;
                    }
                    if (cell.label) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        }
    });
}

// Fallback for old static templates
async function generateStaticPDF({ template, student, exam, customFields }) {
    const layoutConfig = template.layoutConfig;

    const doc = new jsPDF({
        orientation: layoutConfig.orientation || 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background
    const bgColor = hexToRgb(layoutConfig.backgroundColor || '#FFFFFF');
    doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Logo
    if (layoutConfig.logoUrl) {
        try {
            doc.addImage(layoutConfig.logoUrl, 'PNG', pageWidth / 2 - 20, 20, 40, 40);
        } catch (error) {
            console.error('Error adding logo:', error);
        }
    }

    // Header Text
    if (layoutConfig.headerText) {
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        const headerColor = hexToRgb(layoutConfig.primaryColor || '#000000');
        doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
        doc.text(layoutConfig.headerText, pageWidth / 2, 30, { align: 'center' });
    }

    // Student info
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const textColor = hexToRgb(layoutConfig.textColor || '#000000');
    doc.setTextColor(textColor.r, textColor.g, textColor.b);

    let yPos = 50;
    doc.text(`Roll Number: ${student.rollNumber}`, 20, yPos);
    yPos += 10;
    doc.text(`Name: ${student.name}`, 20, yPos);
    yPos += 10;
    doc.text(`Class: ${student.class?.className || 'N/A'}`, 20, yPos);

    // Signature
    if (layoutConfig.signatureUrl) {
        try {
            doc.addImage(layoutConfig.signatureUrl, 'PNG', 30, pageHeight - 40, 40, 20);
        } catch (error) {
            console.error('Error adding signature:', error);
        }
    }

    const pdfDataUrl = doc.output('dataurlstring');
    return pdfDataUrl;
}

export { generateAdmitCardPDF as generatePDF };