'use client';

import { forwardRef } from 'react';

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

    // ============ THERMAL 80mm LAYOUT ============
    if (paperSize === 'thermal') {
        return (
            <div
                ref={ref}
                style={{
                    width: '80mm',
                    padding: '3mm',
                    fontFamily: 'monospace, Arial, sans-serif',
                    fontSize: '11px',
                    color: '#000',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>{schoolName}</div>
                    <div style={{ fontSize: '9px' }}>{schoolAddress}</div>
                    {schoolContact && <div style={{ fontSize: '9px' }}>Ph: {schoolContact}</div>}
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>FEE RECEIPT</div>
                </div>

                {/* Receipt Info */}
                <div style={{ fontSize: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>No: {receiptNumber}</span>
                        <span>{receiptDate}</span>
                    </div>
                    <div>Student: {studentName}</div>
                    {degree && <div>Class: {degree}</div>}
                    {admissionNo && <div>Adm No: {admissionNo}</div>}
                    {financialYear && <div>Session: {financialYear}</div>}
                </div>

                {/* Divider */}
                <div style={{ borderBottom: '1px dashed #000', marginBottom: '6px' }} />

                {/* Fee Items */}
                {feeItems.length > 0 ? (
                    feeItems.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
                            <span style={{ flex: 1 }}>{item.description}</span>
                            <span>₹{item.amount?.toLocaleString('en-IN')}</span>
                        </div>
                    ))
                ) : (
                    <div style={{ fontSize: '10px', color: '#666' }}>No items</div>
                )}

                {/* Divider */}
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                    <span>TOTAL PAID</span>
                    <span>₹{calculatedTotal.toLocaleString('en-IN')}</span>
                </div>

                {showBalanceDue && balanceAfterPayment > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
                        <span>Balance Due</span>
                        <span>₹{balanceAfterPayment.toLocaleString('en-IN')}</span>
                    </div>
                )}

                {showPaymentMode && paymentMode && (
                    <div style={{ fontSize: '9px', marginTop: '4px' }}>
                        Mode: {paymentMode}
                    </div>
                )}

                {transactionId && transactionId !== 'N/A' && (
                    <div style={{ fontSize: '9px' }}>Txn: {transactionId}</div>
                )}

                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

                {/* Footer */}
                <div style={{ textAlign: 'center', fontSize: '9px' }}>
                    <div>Computer Generated Receipt</div>
                    {receiptFooterText && <div style={{ marginTop: '2px' }}>{receiptFooterText}</div>}
                    {showSignatureLine && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid #000', display: 'inline-block', width: '40mm', paddingTop: '2px' }}>
                            Authorized Sign
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============ A4 / LETTER LAYOUT ============
    return (
        <div
            ref={ref}
            className="bg-white mx-auto"
            style={{
                width: '8.5in',
                height: '11in',
                padding: '0.5in',
                fontFamily: 'Arial, sans-serif',
                fontSize: '11px',
                color: '#000',
                boxSizing: 'border-box',
                border: '2px solid #8B0000',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header Section with Logo and School Info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', borderBottom: '3px solid #8B0000', paddingBottom: '8px' }}>
                {/* Left Logo */}
                {showSchoolLogo && schoolLogo && (
                    <div style={{ width: '60px', marginRight: '12px', flexShrink: 0 }}>
                        <img
                            src={schoolLogo}
                            alt={schoolName}
                            style={{ width: '60px', height: '60px', objectFit: 'contain', display: 'block' }}
                        />
                    </div>
                )}

                {/* Center - School Name and Details */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#8B0000', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                        {schoolName}
                    </h1>
                    <p style={{ margin: '2px 0', fontSize: '10px' }}>{schoolAddress}</p>
                    <p style={{ margin: '2px 0', fontSize: '10px' }}>
                        {schoolContact && `Phone: ${schoolContact}`}{schoolEmail ? ` | Email: ${schoolEmail}` : ''}
                    </p>
                </div>

                {/* Right Logo/Seal */}
                {showSchoolLogo && schoolLogo && (
                    <div style={{ width: '60px', marginLeft: '12px', flexShrink: 0 }}>
                        <img
                            src={schoolLogo}
                            alt={`${schoolName} Seal`}
                            style={{
                                width: '60px', height: '60px', objectFit: 'contain', display: 'block',
                                borderRadius: '50%', border: '2px solid #8B0000', padding: '4px', boxSizing: 'border-box'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Maroon Header Bar */}
            <div style={{ backgroundColor: '#8B0000', color: 'white', textAlign: 'center', padding: '6px', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>
                FEE RECEIPT
            </div>

            {/* Receipt Details - Two Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px', fontSize: '11px' }}>
                <div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Receipt No :</span>
                        <span>{receiptNumber}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Student :</span>
                        <span>{studentName}</span>
                    </div>
                    {fatherName && (
                        <div style={{ display: 'flex', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', width: '120px' }}>Father&apos;s Name :</span>
                            <span>{fatherName}</span>
                        </div>
                    )}
                    {admissionNo && (
                        <div style={{ display: 'flex', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', width: '120px' }}>Admission No :</span>
                            <span>{admissionNo}</span>
                        </div>
                    )}
                </div>
                <div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Receipt Date :</span>
                        <span>{receiptDate}</span>
                    </div>
                    {degree && (
                        <div style={{ display: 'flex', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', width: '120px' }}>Class :</span>
                            <span>{degree}</span>
                        </div>
                    )}
                    {financialYear && (
                        <div style={{ display: 'flex', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', width: '120px' }}>Session :</span>
                            <span>{financialYear}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Fee Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', border: '1px solid #000' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold', width: '60px' }}>S.NO</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>PARTICULARS</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold', width: '120px' }}>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {feeItems.length > 0 ? (
                        feeItems.map((item, index) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{index + 1}</td>
                                <td style={{ border: '1px solid #000', padding: '6px' }}>{item.description}</td>
                                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>1</td>
                            <td style={{ border: '1px solid #000', padding: '6px' }}>Fee Payment</td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>₹{calculatedTotal.toLocaleString('en-IN')}</td>
                        </tr>
                    )}

                    {/* Empty rows for spacing */}
                    {[...Array(Math.max(0, 5 - feeItems.length))].map((_, i) => (
                        <tr key={`empty-${i}`}>
                            <td style={{ border: '1px solid #000', padding: '6px', height: '25px' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #000', padding: '6px' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #000', padding: '6px' }}>&nbsp;</td>
                        </tr>
                    ))}

                    {/* Total Row */}
                    <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Total Paid</td>
                        <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>₹{calculatedTotal.toLocaleString('en-IN')}</td>
                    </tr>

                    {/* Remaining Balance Row */}
                    {showBalanceDue && balanceAfterPayment > 0 && (
                        <tr style={{ fontWeight: 'bold' }}>
                            <td colSpan="2" style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', color: '#c00' }}>Balance Due</td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', color: '#c00' }}>₹{balanceAfterPayment.toLocaleString('en-IN')}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Payment Details */}
            <div style={{ fontSize: '10px', marginBottom: '12px' }}>
                {totalInWords && (
                    <div style={{ display: 'flex', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 'bold', width: '100px' }}>In words :</span>
                        <span>{totalInWords}</span>
                    </div>
                )}
                {showPaymentMode && paymentMode && (
                    <div style={{ display: 'flex', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 'bold', width: '100px' }}>Payment Mode :</span>
                        <span>{paymentMode}</span>
                    </div>
                )}
                {transactionId && transactionId !== 'N/A' && (
                    <div style={{ display: 'flex', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 'bold', width: '100px' }}>Transaction ID :</span>
                        <span>{transactionId}</span>
                    </div>
                )}
                {remarks && remarks !== 'N/A' && (
                    <div style={{ display: 'flex', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 'bold', width: '100px' }}>Remarks :</span>
                        <span>{remarks}</span>
                    </div>
                )}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Signature Line */}
            {showSignatureLine && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '10px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ borderTop: '1px solid #000', width: '180px', paddingTop: '4px' }}>
                            Student / Parent Signature
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ borderTop: '1px solid #000', width: '180px', paddingTop: '4px' }}>
                            Authorized Signatory
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid #ccc', fontSize: '10px', textAlign: 'center' }}>
                <p style={{ margin: '4px 0', fontWeight: 'bold' }}>This is a Computer Generated Receipt</p>
                {receiptFooterText && (
                    <p style={{ margin: '4px 0', fontSize: '9px' }}>{receiptFooterText}</p>
                )}
                <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                    Fees/Amount once paid will not be refundable or transferable.
                </p>
            </div>
        </div>
    );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';

export default ReceiptTemplate;
