import jsPDF from 'jspdf';

export async function generatePDF({ template, student, certificateNumber, issueDate, customFields }) {
    try {
        const layoutConfig = template.layoutConfig;

        // Create PDF with template settings
        const doc = new jsPDF({
            orientation: layoutConfig.orientation || 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Background
        doc.setFillColor(layoutConfig.backgroundColor || '#FFFFFF');
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Border
        if (layoutConfig.borderColor && layoutConfig.borderWidth) {
            doc.setDrawColor(layoutConfig.borderColor);
            doc.setLineWidth(layoutConfig.borderWidth);
            doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
        }

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
            doc.setFont(layoutConfig.fontFamily || 'helvetica', 'bold');
            doc.setTextColor(layoutConfig.primaryColor || '#000000');
            doc.text(layoutConfig.headerText, pageWidth / 2, 70, { align: 'center' });
        }

        // Certificate Title
        doc.setFontSize(20);
        doc.setFont(layoutConfig.fontFamily || 'helvetica', 'normal');
        doc.setTextColor(layoutConfig.textColor || '#000000');
        doc.text(template.name.toUpperCase(), pageWidth / 2, 90, { align: 'center' });

        // Certificate Number
        doc.setFontSize(10);
        doc.text(`Certificate No: ${certificateNumber}`, pageWidth / 2, 100, { align: 'center' });

        // Main Content
        doc.setFontSize(layoutConfig.fontSize || 14);
        let yPosition = 120;

        doc.text('This is to certify that', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        doc.setFont(layoutConfig.fontFamily || 'helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(student.name, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Underline for name
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 50, yPosition, pageWidth / 2 + 50, yPosition);
        yPosition += 15;

        // Class and Roll Number
        doc.setFontSize(layoutConfig.fontSize || 14);
        doc.setFont(layoutConfig.fontFamily || 'helvetica', 'normal');
        doc.text(
            `Class: ${student.class?.className || 'N/A'} | Roll No: ${student.rollNumber}`,
            pageWidth / 2,
            yPosition,
            { align: 'center' }
        );
        yPosition += 15;

        // Custom Fields
        if (customFields) {
            Object.entries(customFields).forEach(([key, value]) => {
                if (value) {
                    const label = key.replace(/([A-Z])/g, ' $1').trim();
                    doc.text(`${label}: ${value}`, pageWidth / 2, yPosition, { align: 'center' });
                    yPosition += 10;
                }
            });
        }

        // Issue Date
        yPosition += 10;
        doc.setFontSize(12);
        doc.text(
            `Date of Issue: ${new Date(issueDate).toLocaleDateString()}`,
            pageWidth / 2,
            yPosition,
            { align: 'center' }
        );

        // Signature
        if (layoutConfig.signatureUrl) {
            try {
                doc.addImage(layoutConfig.signatureUrl, 'PNG', 30, pageHeight - 50, 40, 20);
                doc.setFontSize(10);
                doc.text('Authorized Signature', 30, pageHeight - 25);
            } catch (error) {
                console.error('Error adding signature:', error);
            }
        }

        // Stamp
        if (layoutConfig.stampUrl) {
            try {
                doc.addImage(layoutConfig.stampUrl, 'PNG', pageWidth - 70, pageHeight - 50, 40, 40);
            } catch (error) {
                console.error('Error adding stamp:', error);
            }
        }

        // Footer Text
        if (layoutConfig.footerText) {
            doc.setFontSize(10);
            doc.setTextColor('#666666');
            doc.text(layoutConfig.footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });
        }

        // Convert to blob and upload (you'll need to implement upload logic)
        const pdfBlob = doc.output('blob');

        // Upload to your storage (S3, Cloudinary, etc.)
        // For now, return a data URL
        const pdfDataUrl = doc.output('dataurlstring');

        return pdfDataUrl;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}