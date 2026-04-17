'use client';

import { forwardRef } from 'react';
import { getReceiptPaperConfig, normalizeReceiptPaperSize } from '@/lib/receipts/receipt-format';

/**
 * Professional Receipt Template
 * Supports A4 (Letter) and Thermal (80mm) paper sizes
 */
const ReceiptTemplate = forwardRef(({
    schoolData = {},
    receiptData = {},
    settings = {}
}, ref) => {
    const {
        name: schoolName = 'School Name',
        profilePicture: schoolLogo,
        location: schoolAddress = 'School Address',
        contactNumber: schoolContact = '',
        email: schoolEmail = ''
    } = schoolData;

    const {
        receiptNumber = 'REC-001',
        receiptDate = new Date().toLocaleDateString('en-IN'),
        studentName = 'Student Name',
        fatherName = '',
        degree = '',
        admissionNo = '',
        academicBatch = '',
        financialYear = '',
        feeItems = [],
        total = 0,
        totalInWords = '',
        balanceAfterPayment = 0,
        paymentMode = '',
        transactionId = '',
        remarks = ''
    } = receiptData;

    const {
        showSchoolLogo = true,
        showBalanceDue = true,
        showPaymentMode = true,
        showSignatureLine = true,
        receiptFooterText = '',
        paperSize = 'a4'
    } = settings;

    const calculatedTotal = total || feeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const normalizedPaperSize = normalizeReceiptPaperSize(paperSize);
    const paperConfig = getReceiptPaperConfig(normalizedPaperSize);

    // ============ THERMAL 80mm LAYOUT ============
    if (normalizedPaperSize === 'thermal') {
        return (
            <div
                ref={ref}
                style={{
                    width: paperConfig.widthCss,
                    padding: '3mm',
                    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
                    fontSize: '11px',
                    color: '#000',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
                    {showSchoolLogo && schoolLogo && (
                        <img
                            src={schoolLogo}
                            style={{ maxWidth: '40px', maxHeight: '40px', margin: '0 auto 4px auto', display: 'block' }}
                            alt="Logo"
                        />
                    )}
                    <h2 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase' }}>{schoolName}</h2>
                    <p style={{ margin: '2px 0', fontSize: '9px' }}>{schoolAddress}</p>
                    <p style={{ margin: '2px 0', fontSize: '9px' }}>Phone: {schoolContact}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '11px' }}>FEE RECEIPT</span>
                        <span style={{ fontSize: '9px' }}>Student&apos;s Copy</span>
                    </div>
                </div>

                {/* Info Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '10px' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '25%', padding: '2px 0' }}>RcptNo</td>
                            <td style={{ width: '75%', padding: '2px 0' }}>:{receiptNumber}</td>
                        </tr>
                        <tr>
                            <td style={{ width: '25%', padding: '2px 0' }}>Admn No</td>
                            <td style={{ width: '75%', padding: '2px 0' }}>:{admissionNo || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '2px 0' }}>Name</td>
                            <td style={{ padding: '2px 0' }}>:{studentName}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '2px 0' }}>Date</td>
                            <td style={{ padding: '2px 0' }}>:{receiptDate}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '2px 0' }}>F.Name</td>
                            <td style={{ padding: '2px 0' }}>:{fatherName || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '2px 0' }}>Session</td>
                            <td style={{ padding: '2px 0' }}>:{financialYear || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '2px 0' }}>Month</td>
                            <td style={{ padding: '2px 0' }}>:{remarks || 'Current'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '2px 0' }}>Class</td>
                            <td style={{ padding: '2px 0' }}>:{degree || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #000', borderBottom: '1px solid #000', marginBottom: '8px', fontSize: '10px' }}>
                    <thead>
                        <tr>
                            <th style={{ borderBottom: '1px solid #000', padding: '4px 0', textAlign: 'left', width: '50%' }}>Head Name</th>
                            <th style={{ borderBottom: '1px solid #000', padding: '4px 0', textAlign: 'right', width: '25%' }}>Dues</th>
                            <th style={{ borderBottom: '1px solid #000', padding: '4px 0', textAlign: 'right', width: '25%' }}>Amt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {feeItems.length > 0 ? (
                            feeItems.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ padding: '4px 0', borderBottom: '1px dotted #ccc', textAlign: 'left' }}># {item.description.toUpperCase()}</td>
                                    <td style={{ padding: '4px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>0.0</td>
                                    <td style={{ padding: '4px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{(item.amount || 0).toFixed(1)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td style={{ padding: '4px 0', borderBottom: '1px dotted #ccc', textAlign: 'left' }}># FEE PAYMENT</td>
                                <td style={{ padding: '4px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>0.0</td>
                                <td style={{ padding: '4px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Totals Box */}
                <div style={{ fontSize: '10px', marginTop: '10px' }}>
                    <div style={{ marginBottom: '6px' }}>
                        Collected By: <b>SYSTEM</b><br />
                        Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}<br />
                        {showPaymentMode ? `PayMode: By ${paymentMode}` : ''}
                    </div>
                    
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr><td style={{ padding: '2px 0' }}>Fee Total</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                            <tr><td style={{ padding: '2px 0' }}>Grand Total</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                            <tr><td colSpan="3"><hr style={{ borderTop: '1px dashed #000', margin: '2px 0' }} /></td></tr>
                            <tr><td style={{ padding: '2px 0' }}>Payable Amt</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                            <tr><td style={{ padding: '2px 0' }}>Paid Amt</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                            {showBalanceDue ? <tr><td style={{ padding: '2px 0' }}>Curr. Dues</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{(balanceAfterPayment || 0).toFixed(1)}</td></tr> : null}
                        </tbody>
                    </table>
                </div>

                {/* Words */}
                <div style={{ fontStyle: 'italic', fontWeight: 'bold', borderTop: '1px solid #000', marginTop: '8px', paddingTop: '8px', fontSize: '9px' }}>
                    Amount In Word: {totalInWords || 'Amount in words here'}
                </div>

                {/* Signatures */}
                {showSignatureLine && (
                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ borderTop: '1px solid #000', width: '45%', textAlign: 'center', fontSize: '9px', paddingTop: '4px' }}>Cashier Sign</div>
                        <div style={{ borderTop: '1px solid #000', width: '45%', textAlign: 'center', fontSize: '9px', paddingTop: '4px' }}>Depositor Sign</div>
                    </div>
                )}

                {/* Footer Text */}
                {receiptFooterText && (
                    <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                        {receiptFooterText}
                    </div>
                )}
            </div>
        );
    }

    // ============ OASIS STYLE (A4 / LETTER) LAYOUT ============
    // Emulates the mobile app's receiptGenerator.js Oasis style structure
    return (
        <div
            ref={ref}
            style={{
                width: paperConfig.widthCss,
                minHeight: paperConfig.heightCss,
                padding: normalizedPaperSize === 'a4' ? '12mm' : '0.45in',
                fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
                fontSize: '12px',
                color: '#000',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
                border: '1px solid #ccc',
            }}
        >
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
                {showSchoolLogo && schoolLogo && (
                    <img
                        src={schoolLogo}
                        style={{ maxWidth: '60px', maxHeight: '60px', marginBottom: '5px' }}
                        alt="Logo"
                    />
                )}
                <h2 style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase' }}>{schoolName}</h2>
                <p style={{ margin: '4px 0', fontSize: '11px' }}>{schoolAddress}</p>
                {/* Slogan can go here if provided in schoolData but typically not in dashboard generic schoolData preview yet */}
                <p style={{ margin: '4px 0', fontSize: '11px' }}>Phone: {schoolContact}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '14px' }}>FEE RECEIPT</span>
                    <span style={{ fontSize: '12px' }}>Student&apos;s Copy</span>
                </div>
            </div>

            {/* Info Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '15px' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '15%', padding: '4px 0' }}>RcptNo</td>
                        <td style={{ width: '35%', padding: '4px 0' }}>:{receiptNumber}</td>
                        <td style={{ width: '15%', padding: '4px 0' }}>Admn No</td>
                        <td style={{ width: '35%', padding: '4px 0' }}>:{admissionNo || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style={{ padding: '4px 0' }}>Name</td>
                        <td style={{ padding: '4px 0' }}>:{studentName}</td>
                        <td style={{ padding: '4px 0' }}>Date</td>
                        <td style={{ padding: '4px 0' }}>:{receiptDate}</td>
                    </tr>
                    <tr>
                        <td style={{ padding: '4px 0' }}>F.Name</td>
                        <td style={{ padding: '4px 0' }}>:{fatherName || 'N/A'}</td>
                        <td style={{ padding: '4px 0' }}>Session</td>
                        <td style={{ padding: '4px 0' }}>:{financialYear || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style={{ padding: '4px 0' }}>Month</td>
                        <td colSpan="3" style={{ padding: '4px 0' }}>:{remarks || 'Current'}</td>
                    </tr>
                    <tr>
                        <td style={{ padding: '4px 0' }}>Class</td>
                        <td colSpan="3" style={{ padding: '4px 0' }}>:{degree || 'N/A'}</td>
                    </tr>
                </tbody>
            </table>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #000', borderBottom: '1px solid #000', marginBottom: '10px' }}>
                <thead>
                    <tr>
                        <th style={{ borderBottom: '1px solid #000', padding: '8px 0', textAlign: 'left', width: '50%' }}>Head Name</th>
                        <th style={{ borderBottom: '1px solid #000', padding: '8px 0', textAlign: 'right', width: '25%' }}>Prev. Dues</th>
                        <th style={{ borderBottom: '1px solid #000', padding: '8px 0', textAlign: 'right', width: '25%' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {feeItems.length > 0 ? (
                        feeItems.map((item, index) => (
                            <tr key={index}>
                                <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'left' }}># {item.description.toUpperCase()}</td>
                                <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>0.0</td>
                                <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{(item.amount || 0).toFixed(1)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'left' }}># FEE PAYMENT</td>
                            <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>0.0</td>
                            <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Totals Box */}
            <table style={{ width: '100%', marginTop: '15px', fontSize: '11px' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', width: '45%', padding: '4px 0' }}>
                            Collected By:<br /><b>SYSTEM</b><br /><br />
                            Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}<br />
                            {showPaymentMode ? `PayMode: By ${paymentMode}` : ''}
                        </td>
                        <td style={{ width: '55%', padding: '4px 0' }}>
                            <table style={{ width: '100%' }}>
                                <tbody>
                                    <tr><td style={{ padding: '2px 0' }}>Fee Total</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                                    <tr><td style={{ padding: '2px 0' }}>Grand Total</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                                    <tr><td colSpan="3"><hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} /></td></tr>
                                    <tr><td style={{ padding: '2px 0' }}>Payable Amt</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                                    <tr><td style={{ padding: '2px 0' }}>Paid Amt</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{calculatedTotal.toFixed(1)}</td></tr>
                                    {showBalanceDue ? <tr><td style={{ padding: '2px 0' }}>Curr. Dues</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0', textAlign: 'right' }}>{(balanceAfterPayment || 0).toFixed(1)}</td></tr> : null}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Words */}
            <div style={{ fontStyle: 'italic', fontWeight: 'bold', borderTop: '1px solid #000', marginTop: '10px', paddingTop: '10px', fontSize: '11px' }}>
                Amount In Word: {totalInWords || 'Amount in words here'}
            </div>

            {/* Signatures */}
            {showSignatureLine && (
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ borderTop: '1px solid #000', width: '40%', textAlign: 'center', fontSize: '11px', paddingTop: '4px' }}>Signature of Cashier</div>
                    <div style={{ borderTop: '1px solid #000', width: '40%', textAlign: 'center', fontSize: '11px', paddingTop: '4px' }}>Signature of Depositor</div>
                </div>
            )}

            {/* Footer Text */}
            {receiptFooterText && (
                <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '25px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                    {receiptFooterText}
                </div>
            )}
        </div>
    );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';

export default ReceiptTemplate;
