'use client';

import { useRef } from 'react';
import ReceiptTemplate from './ReceiptTemplate';
import { Printer } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Receipt Preview Component
 * Displays a live preview of receipt with current settings
 */
export default function ReceiptPreview({ schoolData, settings }) {
    const receiptRef = useRef(null);

    // Sample receipt data with fee head breakup
    const sampleReceiptData = {
        receiptNumber: `${settings.receiptPrefix || 'REC'}-2024-001`,
        receiptDate: new Date().toLocaleDateString('en-IN'),
        studentName: 'John Doe',
        fatherName: 'Ramesh Doe',
        degree: 'Class 10-A',
        admissionNo: 'AD-001',
        financialYear: '2025-26',
        feeItems: [
            { description: 'Tuition Fee', amount: 15000 },
            { description: 'Computer Fee', amount: 3000 },
            { description: 'Library Fee', amount: 1500 },
            { description: 'Sports Fee', amount: 2000 },
        ],
        total: 21500,
        totalInWords: 'Rupees Twenty One Thousand Five Hundred Only',
        balanceAfterPayment: 42500,
        paymentMode: 'Online Banking',
        transactionId: 'TXN-2024-78901',
        remarks: 'Q1 Fee Payment'
    };

    const handlePrint = () => {
        if (receiptRef.current) {
            const printWindow = window.open('', '', 'width=850,height=1100');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receipt Preview</title>
                    <style>
                        @page { size: ${settings.paperSize === 'thermal' ? '80mm auto' : '8.5in 11in'}; margin: 0; }
                        html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact !important; }
                        * { box-sizing: border-box; }
                    </style>
                </head>
                <body>
                    ${receiptRef.current.outerHTML}
                    <script>
                        window.onload = function() { setTimeout(function() { window.print(); }, 100); };
                        window.onafterprint = function() { window.close(); };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const isThermal = settings.paperSize === 'thermal';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Receipt Preview</h3>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Preview
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                <div
                    className="bg-white overflow-auto"
                    style={{
                        maxHeight: isThermal ? '600px' : '1100px',
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div style={{ transform: isThermal ? 'scale(1)' : 'scale(0.65)', transformOrigin: 'top center' }}>
                        <ReceiptTemplate
                            ref={receiptRef}
                            schoolData={schoolData}
                            receiptData={sampleReceiptData}
                            settings={settings}
                        />
                    </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-center">
                    <p className="text-xs text-muted-foreground">
                        Sample Preview • {isThermal ? '80mm Thermal' : '8.5" × 11" (A4/Letter)'} • Updates automatically with settings
                    </p>
                </div>
            </div>
        </div>
    );
}
