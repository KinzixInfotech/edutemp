import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export async function generatePDF({ template, student, certificateNumber, issueDate, customFields, verificationUrl }) {
    try {
        const layoutConfig = template.layoutConfig || {};
        const elements = layoutConfig.elements || [];
        const canvasSize = layoutConfig.canvasSize || { width: 800, height: 600 };
        const orientation = canvasSize.width > canvasSize.height ? 'landscape' : 'portrait';

        // Initialize PDF
        const doc = new jsPDF({
            orientation,
            unit: 'pt',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Calculate scale factor to fit canvas to PDF page
        const scaleX = pageWidth / canvasSize.width;
        const scaleY = pageHeight / canvasSize.height;
        const scale = Math.min(scaleX, scaleY);

        // Center the content
        const offsetX = (pageWidth - canvasSize.width * scale) / 2;
        const offsetY = (pageHeight - canvasSize.height * scale) / 2;

        // Helper to scale coordinates and sizes
        const s = (val) => val * scale;
        const sx = (val) => s(val) + offsetX;
        const sy = (val) => s(val) + offsetY;

        // Background Image
        if (layoutConfig.backgroundImage) {
            try {
                doc.addImage(
                    layoutConfig.backgroundImage,
                    'PNG', // Assuming PNG or JPG, jsPDF detects usually
                    offsetX,
                    offsetY,
                    s(canvasSize.width),
                    s(canvasSize.height)
                );
            } catch (error) {
                console.error('Error adding background image:', error);
            }
        } else if (layoutConfig.backgroundColor) {
            doc.setFillColor(layoutConfig.backgroundColor);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }

        // Prepare data for placeholders
        const data = {
            '{{studentName}}': student.name || '',
            '{{studentId}}': student.studentId || '',
            '{{rollNumber}}': student.rollNumber || '',
            '{{class}}': student.class?.className || '',
            '{{section}}': student.section?.sectionName || '',
            '{{dob}}': student.dob ? new Date(student.dob).toLocaleDateString() : '',
            '{{fatherName}}': student.fatherName || '',
            '{{motherName}}': student.motherName || '',
            '{{schoolName}}': template.school?.name || '', // Assuming template includes school
            '{{issueDate}}': new Date(issueDate).toLocaleDateString(),
            '{{certificateNumber}}': certificateNumber,
            '{{verificationUrl}}': verificationUrl || '',
            ...customFields
        };

        // Render Elements
        for (const el of elements) {
            try {
                const x = sx(el.x);
                const y = sy(el.y);
                const w = s(el.width);
                const h = s(el.height);

                switch (el.type) {
                    case 'text': {
                        let content = el.content || '';
                        // Replace placeholders
                        Object.entries(data).forEach(([key, value]) => {
                            content = content.replace(new RegExp(key, 'g'), value);
                        });

                        doc.setFontSize(s(el.fontSize));
                        doc.setTextColor(el.color || '#000000');

                        // Font handling (basic mapping)
                        const fontStyle = el.fontWeight === 'bold' ? 'bold' : 'normal';
                        const fontName = el.fontFamily === 'Times New Roman' ? 'times' : 'helvetica';
                        doc.setFont(fontName, fontStyle);

                        // Alignment
                        const align = el.textAlign || 'left';
                        let textX = x;
                        if (align === 'center') textX = x + w / 2;
                        if (align === 'right') textX = x + w;

                        // Vertical alignment (approximate centering)
                        const textY = y + h / 2 + s(el.fontSize) / 3;

                        doc.text(content, textX, textY, { align, baseline: 'middle' });
                        break;
                    }
                    case 'image': {
                        if (el.url) {
                            let imgUrl = el.url;
                            // Handle dynamic images if needed (e.g. {{studentPhoto}})
                            if (imgUrl.includes('{{studentPhoto}}') && student.photoUrl) {
                                imgUrl = student.photoUrl;
                            }

                            doc.addImage(imgUrl, 'PNG', x, y, w, h);
                        }
                        break;
                    }
                    case 'qrcode': {
                        let content = el.content || '';
                        Object.entries(data).forEach(([key, value]) => {
                            content = content.replace(new RegExp(key, 'g'), value);
                        });

                        if (content) {
                            const qrDataUrl = await QRCode.toDataURL(content);
                            doc.addImage(qrDataUrl, 'PNG', x, y, w, h);
                        }
                        break;
                    }
                    case 'shape': {
                        doc.setFillColor(el.backgroundColor || 'transparent');
                        doc.setDrawColor(el.borderColor || 'transparent');
                        doc.setLineWidth(s(el.borderWidth || 0));

                        if (el.shapeType === 'circle') {
                            const radius = Math.min(w, h) / 2;
                            doc.circle(x + w / 2, y + h / 2, radius, 'FD');
                        } else {
                            // Rectangle
                            if (el.borderRadius > 0) {
                                doc.roundedRect(x, y, w, h, s(el.borderRadius), s(el.borderRadius), 'FD');
                            } else {
                                doc.rect(x, y, w, h, 'FD');
                            }
                        }
                        break;
                    }
                }
            } catch (err) {
                console.error(`Error rendering element ${el.id}:`, err);
            }
        }

        const pdfDataUrl = doc.output('dataurlstring');
        return pdfDataUrl;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}