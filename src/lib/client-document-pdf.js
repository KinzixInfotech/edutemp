import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

function getPdfFormat(canvasSize = {}) {
    const width = Number(canvasSize?.width) || 794;
    const height = Number(canvasSize?.height) || 1123;
    return {
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
    };
}

function toRgb(color = '#000000') {
    if (!color || color === 'transparent') return null;
    if (color.startsWith('rgb')) {
        const values = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
        return { r: values[0] || 0, g: values[1] || 0, b: values[2] || 0 };
    }

    const hex = color.replace('#', '').trim();
    const normalized = hex.length === 3
        ? hex.split('').map((char) => char + char).join('')
        : hex;

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 0, g: 0, b: 0 };

    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    };
}

function applyTextStyles(pdf, element) {
    const fontFamily = String(element?.fontFamily || '').toLowerCase();
    const fontStyle = [
        element?.fontWeight === 'bold' ? 'bold' : null,
        element?.fontStyle === 'italic' ? 'italic' : null,
    ].filter(Boolean).join('');

    let family = 'helvetica';
    if (fontFamily.includes('times') || fontFamily.includes('georgia') || fontFamily.includes('garamond')) {
        family = 'times';
    } else if (fontFamily.includes('courier')) {
        family = 'courier';
    }

    pdf.setFont(family, fontStyle || 'normal');
    pdf.setFontSize(Number(element?.fontSize) || 14);

    const color = toRgb(element?.color || '#000000');
    if (color) {
        pdf.setTextColor(color.r, color.g, color.b);
    }
}

async function toDataUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:')) return url;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load asset: ${url}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function getImageFormat(dataUrl = '') {
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'PNG';
}

function renderBackground(pdf, layoutConfig, width, height) {
    const backgroundColor = toRgb(layoutConfig?.backgroundColor || '#ffffff');
    if (backgroundColor) {
        pdf.setFillColor(backgroundColor.r, backgroundColor.g, backgroundColor.b);
        pdf.rect(0, 0, width, height, 'F');
    }
}

function renderShape(pdf, element) {
    const x = Number(element?.x) || 0;
    const y = Number(element?.y) || 0;
    const width = Number(element?.width) || 0;
    const height = Number(element?.height) || 0;
    const borderWidth = Number(element?.borderWidth) || 0;
    const bgColor = toRgb(element?.backgroundColor);
    const borderColor = toRgb(element?.borderColor);

    if (bgColor) {
        pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    }
    if (borderColor) {
        pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    }
    pdf.setLineWidth(borderWidth);

    const drawMode = bgColor && borderWidth > 0 ? 'FD' : bgColor ? 'F' : 'S';

    if (element?.shapeType === 'circle') {
        pdf.circle(x + width / 2, y + height / 2, Math.min(width, height) / 2, drawMode);
        return;
    }

    if (element?.shapeType === 'line') {
        pdf.line(x, y, x + width, y + height);
        return;
    }

    const radius = Number(element?.borderRadius) || 0;
    if (radius > 0) {
        pdf.roundedRect(x, y, width, height, radius, radius, drawMode);
    } else {
        pdf.rect(x, y, width, height, drawMode);
    }
}

function renderText(pdf, element) {
    const x = Number(element?.x) || 0;
    const y = Number(element?.y) || 0;
    const width = Number(element?.width) || 0;
    const height = Number(element?.height) || 0;
    const text = String(element?.content || '');
    const align = element?.textAlign || 'left';
    const lineHeightFactor = Number(element?.lineHeight) || 1.2;
    const fontSize = Number(element?.fontSize) || 14;

    if (element?.backgroundColor && element.backgroundColor !== 'transparent') {
        const backgroundColor = toRgb(element.backgroundColor);
        if (backgroundColor) {
            pdf.setFillColor(backgroundColor.r, backgroundColor.g, backgroundColor.b);
            pdf.rect(x, y, width, height, 'F');
        }
    }

    applyTextStyles(pdf, element);
    const lines = text
        .split('\n')
        .flatMap((line) => pdf.splitTextToSize(line || ' ', Math.max(width, 1)));

    const lineHeight = fontSize * lineHeightFactor;
    let currentY = y + fontSize;
    lines.forEach((line) => {
        if (currentY <= y + height + lineHeight) {
            let textX = x;
            if (align === 'center') textX = x + width / 2;
            if (align === 'right') textX = x + width;
            pdf.text(line, textX, currentY, { align });
            currentY += lineHeight;
        }
    });
}

async function renderImage(pdf, element) {
    const x = Number(element?.x) || 0;
    const y = Number(element?.y) || 0;
    const width = Number(element?.width) || 0;
    const height = Number(element?.height) || 0;
    const dataUrl = await toDataUrl(element?.url);
    if (!dataUrl) return;

    const borderWidth = Number(element?.borderWidth) || 0;
    if (borderWidth > 0) {
        const borderColor = toRgb(element?.borderColor || '#000000');
        if (borderColor) {
            pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
            pdf.setLineWidth(borderWidth);
            pdf.rect(x, y, width, height);
        }
    }

    pdf.addImage(dataUrl, getImageFormat(dataUrl), x, y, width, height);
}

async function renderQr(pdf, element) {
    const x = Number(element?.x) || 0;
    const y = Number(element?.y) || 0;
    const width = Number(element?.width) || 100;
    const height = Number(element?.height) || 100;
    const value = String(element?.content || '').trim();
    if (!value) return;

    const qrDataUrl = await QRCode.toDataURL(value, { margin: 0 });
    pdf.addImage(qrDataUrl, 'PNG', x, y, width, height);
}

function renderTable(pdf, element) {
    const startX = Number(element?.x) || 0;
    const startY = Number(element?.y) || 0;
    const width = Number(element?.width) || 450;
    const columns = Array.isArray(element?.columns) ? element.columns : [];
    const tableData = Array.isArray(element?.tableData) ? element.tableData : [];

    const head = columns.length > 0 ? [columns.map((col) => col.label || col.key || '')] : [];
    const body = tableData.map((row) => columns.map((col) => row?.[col.key] ?? ''));

    const stylesColor = toRgb(element?.borderColor || '#cbd5e1');
    const headerBg = toRgb(element?.headerBackgroundColor || '#f1f5f9');
    const rowBg = toRgb(element?.rowBackgroundColor || '#ffffff');
    const textColor = toRgb(element?.color || '#111827');

    const columnStyles = {};
    if (columns.length > 0) {
        columns.forEach((col, index) => {
            if (col?.width) {
                columnStyles[index] = {
                    cellWidth: Number(col.width),
                };
            }
        });
    }

    pdf.autoTable({
        startY,
        margin: { left: startX, right: Math.max(0, pdf.internal.pageSize.getWidth() - startX - width) },
        tableWidth: width,
        head,
        body,
        styles: {
            fontSize: Number(element?.fontSize) || 10,
            cellPadding: 4,
            lineColor: stylesColor ? [stylesColor.r, stylesColor.g, stylesColor.b] : undefined,
            lineWidth: Number(element?.borderWidth) || 0.5,
            textColor: textColor ? [textColor.r, textColor.g, textColor.b] : undefined,
            halign: element?.textAlign || 'center',
            fillColor: rowBg ? [rowBg.r, rowBg.g, rowBg.b] : undefined,
        },
        headStyles: {
            fillColor: headerBg ? [headerBg.r, headerBg.g, headerBg.b] : undefined,
            fontStyle: (element?.headerFontWeight === 'bold' ? 'bold' : 'normal'),
        },
        columnStyles,
    });
}

export async function renderPdfFromLayout(layoutConfig = {}) {
    const { width, height, orientation } = getPdfFormat(layoutConfig?.canvasSize);
    const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [width, height],
    });

    renderBackground(pdf, layoutConfig, width, height);

    if (layoutConfig?.backgroundImage) {
        try {
            const backgroundDataUrl = await toDataUrl(layoutConfig.backgroundImage);
            if (backgroundDataUrl) {
                pdf.addImage(backgroundDataUrl, getImageFormat(backgroundDataUrl), 0, 0, width, height);
            }
        } catch (error) {
            console.warn('Failed to render PDF background image:', error);
        }
    }

    const elements = Array.isArray(layoutConfig?.elements)
        ? [...layoutConfig.elements].sort((a, b) => (a?.zIndex || 0) - (b?.zIndex || 0))
        : [];

    for (const element of elements) {
        try {
            if (element?.type === 'shape') renderShape(pdf, element);
            if (element?.type === 'text') renderText(pdf, element);
            if (element?.type === 'image') await renderImage(pdf, element);
            if (element?.type === 'qrcode') await renderQr(pdf, element);
            if (element?.type === 'table') renderTable(pdf, element);
        } catch (error) {
            console.warn(`Failed to render PDF element ${element?.id || element?.type}:`, error);
        }
    }

    return pdf;
}

export async function createPdfBlobFromLayout(layoutConfig = {}) {
    const pdf = await renderPdfFromLayout(layoutConfig);
    return pdf.output('blob');
}

export async function downloadPdfFromLayout(layoutConfig = {}, filename = 'document.pdf') {
    const pdf = await renderPdfFromLayout(layoutConfig);
    pdf.save(filename);
}
