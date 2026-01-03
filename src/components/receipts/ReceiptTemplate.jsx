'use client';

import { forwardRef } from 'react';

/**
 * Professional Receipt Template - Based on User's Provided Design
 * Sized for 8.5 × 11 inches (US Letter)
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
        contactNumber: schoolContact = 'Contact Number',
        email: schoolEmail = 'Email'
    } = schoolData;

    const {
        receiptNumber = 'OFR202311200013',
        receiptDate = '02/11/2023',
        studentName = 'VIPUL RAMESH HEDGIKAR',
        fatherName = 'RAMESH HEDGIKAR',
        degree = 'MBA',
        year = '1',
        academicBatch = '2022-2024',
        branch = 'MBA',
        financialYear = '2023-2024',
        feeItems = [],
        total = 0,
        totalInWords = 'Rupees Five Thousand Only',
        dueAmount = 0,
        handlingCharges = 0,
        finalAmount = 0,
        paymentMode = 'Online Payment Via UPI/DEBIT/CREDIT/Net Banking/IMPS/GC',
        transactionId = 'NO : 1329/484-GC/A/Net-Exe/GXIII/23',
        bankName = 'CANARA BANK,JALGAON:8072018932122',
        remarks = 'Student Online Payment'
    } = receiptData;

    const { showSchoolLogo = true, receiptFooterText = '' } = settings;

    return (
        <div
            ref={ref}
            className="bg-white mx-auto"
            style={{
                width: '8.5in',
                height: '11in',  // Fixed height instead of minHeight
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
                            style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'contain',
                                display: 'block'
                            }}
                        />
                    </div>
                )}

                {/* Center - School Name and Details */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#8B0000',
                        margin: '0 0 4px 0',
                        textTransform: 'uppercase'
                    }}>
                        {schoolName}
                    </h1>
                    <p style={{ margin: '2px 0', fontSize: '10px' }}>{schoolAddress}</p>
                    <p style={{ margin: '2px 0', fontSize: '10px' }}>
                        Phone: {schoolContact}{schoolEmail ? ` | Email: ${schoolEmail}` : ''}
                    </p>
                </div>

                {/* Right Logo/Seal */}
                {showSchoolLogo && schoolLogo && (
                    <div style={{ width: '60px', marginLeft: '12px', flexShrink: 0 }}>
                        <img
                            src={schoolLogo}
                            alt={`${schoolName} Seal`}
                            style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'contain',
                                display: 'block',
                                borderRadius: '50%',
                                border: '2px solid #8B0000',
                                padding: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Maroon Header Bar with Receipt Type */}
            <div style={{
                backgroundColor: '#8B0000',
                color: 'white',
                textAlign: 'center',
                padding: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '12px'
            }}>
                OTHER FEES RECEIPT
            </div>

            {/* Student Copy Label */}
            <div style={{ textAlign: 'right', marginBottom: '8px', fontWeight: 'bold' }}>
                Student Copy
            </div>

            {/* Receipt Details - Two Columns */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '12px',
                fontSize: '11px'
            }}>
                {/* Left Column */}
                <div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Receipt No :</span>
                        <span>{receiptNumber}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Student :</span>
                        <span>{studentName}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Father's Name :</span>
                        <span>{fatherName}</span>
                    </div>

                </div>

                {/* Right Column */}
                <div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Receipt Date :</span>
                        <span>{receiptDate}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Acad. Batch :</span>
                        <span>{academicBatch}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', width: '120px' }}>Session :</span>
                        <span>{financialYear}</span>
                    </div>
                </div>
            </div>

            {/* Fee Items Table */}
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '12px',
                border: '1px solid #000'
            }}>
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
                                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{item.amount.toFixed(2)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>1</td>
                            <td style={{ border: '1px solid #000', padding: '6px' }}>Autonomous Exam Fee</td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>5,000.00</td>
                        </tr>
                    )}

                    {/* Empty rows for spacing */}
                    {[...Array(Math.max(0, 5 - feeItems.length))].map((_, i) => (
                        <tr key={`empty-${i}`}>
                            <td style={{ border: '1px solid #000', padding: '6px', height: '30px' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #000', padding: '6px' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #000', padding: '6px' }}>&nbsp;</td>
                        </tr>
                    ))}

                    {/* Total Row */}
                    <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Total</td>
                        <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>₹ {total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Payment Details */}
            <div style={{ fontSize: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>In words :</span>
                    <span>{totalInWords}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>INR :</span>
                    <span>₹ {total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>Due :</span>
                    <span>Upto Hundred Rupees Only</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>Handling :</span>
                    <span>0.00</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>Final :</span>
                    <span style={{ fontWeight: 'bold' }}>₹ {finalAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>Pay's Mode :</span>
                    <span>{paymentMode}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>Onl.Tx :</span>
                    <span>{transactionId}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>Bank :</span>
                    <span>{bankName}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', width: '100px' }}>Remarks :</span>
                    <span>{remarks}</span>
                </div>
            </div>

            {/* Spacer to push footer to bottom */}
            <div style={{ flex: 1 }}></div>

            {/* Footer */}
            <div style={{
                marginTop: '20px',
                paddingTop: '12px',
                borderTop: '1px solid #ccc',
                fontSize: '10px',
                textAlign: 'center'
            }}>
                <p style={{ margin: '4px 0', fontWeight: 'bold' }}>This is Computer Generated Receipt</p>
                {receiptFooterText && (
                    <p style={{ margin: '4px 0', fontSize: '9px' }}>{receiptFooterText}</p>
                )}
                <p style={{ margin: '8px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                    Note : Produce this receipt for future clarification in respective of fees paid.<br />
                    * affixed on behalf of third party on tax provider
                </p>
            </div>
        </div>
    );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';

export default ReceiptTemplate;
