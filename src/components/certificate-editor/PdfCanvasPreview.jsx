'use client';

import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfCanvasPreview({ file, width, error = null }) {
    if (!file) return null;

    return (
        <Document file={file} loading={null} error={error}>
            <Page
                pageNumber={1}
                width={width}
                renderAnnotationLayer={false}
                renderTextLayer={false}
            />
        </Document>
    );
}
