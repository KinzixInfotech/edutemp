export const RECEIPT_PAPER_SIZES = {
    a4: {
        value: 'a4',
        label: 'A4',
        widthMm: 210,
        heightMm: 297,
        widthCss: '210mm',
        heightCss: '297mm',
        printPageSize: 'A4 portrait',
        previewScale: 0.52,
    },
    letter: {
        value: 'letter',
        label: 'Letter',
        widthMm: 215.9,
        heightMm: 279.4,
        widthCss: '8.5in',
        heightCss: '11in',
        printPageSize: 'Letter portrait',
        previewScale: 0.6,
    },
    thermal: {
        value: 'thermal',
        label: 'Thermal 80mm',
        widthMm: 80,
        heightMm: 220,
        widthCss: '80mm',
        heightCss: 'auto',
        printPageSize: '80mm auto',
        previewScale: 1,
    },
};

export function normalizeReceiptPaperSize(value) {
    if (value === 'thermal' || value === 'letter' || value === 'a4') {
        return value;
    }

    return 'a4';
}

export function getReceiptPaperConfig(value) {
    const normalized = normalizeReceiptPaperSize(value);
    return RECEIPT_PAPER_SIZES[normalized];
}

export function getReceiptPaperOptions() {
    return Object.values(RECEIPT_PAPER_SIZES);
}
