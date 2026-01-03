import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate PDF from Receipt Template
 * @param {HTMLElement} receiptElement - The receipt DOM element to convert
 * @param {string} filename - Suggested filename for the PDF
 * @returns {Promise<Blob>} - PDF blob
 */
export async function generateReceiptPDF(receiptElement, filename = 'receipt.pdf') {
    try {
        // Convert the receipt HTML to canvas
        const canvas = await html2canvas(receiptElement, {
            scale: 2, // Higher quality
            useCORS: true, // Allow cross-origin images (for school logo)
            logging: false,
            backgroundColor: '#ffffff',
        });

        // Get canvas dimensions
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');

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
export async function downloadReceiptPDF(receiptElement, filename = 'receipt.pdf') {
    try {
        const blob = await generateReceiptPDF(receiptElement, filename);

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
 * Generate PDF and upload to UploadThing
 * @param {HTMLElement} receiptElement - Receipt DOM element
 * @param {Object} uploadConfig - UploadThing configuration
 * @param {string} uploadConfig.endpoint - UploadThing endpoint URL
 * @param {Object} uploadConfig.metadata - Metadata for upload
 * @param {string} filename - Suggested filename
 * @returns {Promise<Object>} - Upload result with URL
 */
export async function uploadReceiptPDF(receiptElement, uploadConfig, filename = 'receipt.pdf') {
    try {
        // Generate PDF blob
        const pdfBlob = await generateReceiptPDF(receiptElement, filename);

        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', pdfBlob, filename);

        // Add metadata
        if (uploadConfig.metadata) {
            formData.append('metadata', JSON.stringify(uploadConfig.metadata));
        }

        // Upload to UploadThing
        const response = await fetch(uploadConfig.endpoint, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}
