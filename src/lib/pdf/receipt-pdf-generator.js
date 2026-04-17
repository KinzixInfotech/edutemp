import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getReceiptPaperConfig, normalizeReceiptPaperSize } from '@/lib/receipts/receipt-format';

/**
 * Generate PDF from Receipt Template
 * @param {HTMLElement} receiptElement - The receipt DOM element to convert
 * @param {string} filename - Suggested filename for the PDF
 * @returns {Promise<Blob>} - PDF blob
 */
export async function generateReceiptPDF(receiptElement, filename = 'receipt.pdf', paperSize = 'a4') {
    try {
        const paperConfig = getReceiptPaperConfig(normalizeReceiptPaperSize(paperSize));

        // Convert the receipt HTML to canvas
        const canvas = await html2canvas(receiptElement, {
            scale: 2, // Higher quality
            useCORS: true, // Allow cross-origin images (for school logo)
            logging: false,
            backgroundColor: '#ffffff',
        });

        // Get canvas dimensions
        const imgWidth = paperConfig.widthMm;
        const pageHeight = paperConfig.heightMm;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: paperConfig.value === 'thermal'
                ? [paperConfig.widthMm, Math.max(paperConfig.heightMm, imgHeight)]
                : [paperConfig.widthMm, paperConfig.heightMm],
        });

        // Calculate if content fits on one page
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            0,
            position,
            imgWidth,
            imgHeight
        );

        heightLeft -= pageHeight;

        // Add additional pages if content is longer
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(
                canvas.toDataURL('image/png'),
                'PNG',
                0,
                position,
                imgWidth,
                imgHeight
            );
            heightLeft -= pageHeight;
        }

        // Return as blob for upload
        return pdf.output('blob');

    } catch (error) {
        console.error('PDF generation error:', error);
        throw new Error('Failed to generate PDF: ' + error.message);
    }
}

/**
 * Generate and download PDF locally (for testing)
 * @param {HTMLElement} receiptElement 
 * @param {string} filename 
 */
export async function downloadReceiptPDF(receiptElement, filename = 'receipt.pdf', paperSize = 'a4') {
    try {
        const blob = await generateReceiptPDF(receiptElement, filename, paperSize);

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
}

/**
 * Generate PDF and Return Blob (used by useReceiptGenerator for R2 upload)
 */
export async function uploadReceiptPDF(receiptElement, uploadConfig, filename = 'receipt.pdf') {
    // This function is legacy and should be replaced by useReceiptGenerator's direct R2 upload.
    // However, we'll keep a clean version that returns the blob if needed, 
    // or simply mark it as DEPRECATED.
    throw new Error('uploadReceiptPDF is deprecated. Use useReceiptGenerator hook instead.');
}
