'use client';

import { useRef, useEffect } from 'react';
import ReceiptTemplate from './ReceiptTemplate';
import { Printer } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Receipt Preview Component
 * Always displays receipt preview (no toggle)
 */
export default function ReceiptPreview({ schoolData, settings }) {
    const receiptRef = useRef(null);

    // Debug: Log school data to check what we're receiving
    useEffect(() => {
        console.log('📋 ReceiptPreview - schoolData:', schoolData);
        console.log('📋 ReceiptPreview - settings:', settings);
    }, [schoolData, settings]);

    // Sample receipt data
    const sampleReceiptData = {
        receiptNumber: `${settings.receiptPrefix || 'REC'}-2024-001`,
        receiptDate: new Date().toLocaleDateString('en-IN'),
        studentName: 'John Doe',
        fatherName: 'RAMESH HEDGIKAR',
        academicBatch: '2022-2024',
        feeItems: [
            { description: 'Tuition Fee for Q1', quantity: 1, amount: 15000 },
            { description: 'Laboratory Fee', quantity: 1, amount: 3000 },
            { description: 'Library Fee', quantity: 1, amount: 1500 },
            { description: 'Sports Fee', quantity: 1, amount: 2000 },
        ],
        total: 21500,
        totalInWords: 'Rupees Twenty One Thousand Five Hundred Only',
        finalAmount: 21500,
        paymentMethod: 'Online Payment Via UPI/DEBIT/CREDIT/Net Banking/IMPS/GC',
        transactionId: 'NO : 1329/484-GC/A/Net-Exe/GXIII/23',
        bankName: 'CANARA BANK,JALGAON:8072018932122',
        remarks: 'Student Online Payment'
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
                        @page {
                            size: 8.5in 11in;
                            margin: 0;
                        }
                        @media print {
                            html, body {
                                width: 8.5in;
                                height: 11in;
                                margin: 0;
                                padding: 0;
                            }
                        }
                        html, body {
                            margin: 0;
                            padding: 0;
                            font-family: Arial, sans-serif;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        * {
                            box-sizing: border-box;
                        }
                        /* Container styling to match preview */
                        .receipt-container {
                            width: 8.5in;
                            height: 11in;
                            padding: 0.5in;
                            font-family: Arial, sans-serif;
                            font-size: 11px;
                            color: #000;
                            box-sizing: border-box;
                            border: 2px solid #8B0000;
                            display: flex;
                            flex-direction: column;
                            background: white;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                        }
                        td, th {
                            border: 1px solid #000;
                            padding: 6px;
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        ${receiptRef.current.innerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 100);
                        };
                        window.onafterprint = function() {
                            window.close();
                        };
                    </script>
                </body>
                </html>
            `);

            printWindow.document.close();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Receipt Preview</h3>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Preview
                </Button>
            </div>

            {/* Always visible preview */}
            <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                <div className="bg-white overflow-auto" style={{ maxHeight: '1100px', display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center' }}>
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
                        Sample Preview • 8.5" × 11" (US Letter) • Updates automatically with settings
                    </p>
                </div>
            </div>
        </div>
    );
}
