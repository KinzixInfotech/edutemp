'use client';

import { forwardRef } from 'react';

/**
 * Fee Statement Template - Universal "Read-Only" Ledger
 * Sized for 8.5 × 11 inches (US Letter)
 */
const FeeStatementTemplate = forwardRef(({
    schoolData = {},
    studentData = {},
    feeSummary = {},
    ledgerData = [],
    receiptsList = [],
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
        studentName = '',
        admissionNo = '',
        className = '',
        sectionName = '',
        rollNo = '',
        feeStructureName = '',
        academicYear = '2025-26'
    } = studentData;

    const {
        totalFee = 0,
        totalPaid = 0,
        totalDiscount = 0,
        balanceDue = 0
    } = feeSummary;

    // Helper to determine Ledger Columns based on Mode
    const getColumns = () => {
        // Default Columns (Universal)
        return [
            { label: 'Period / Inst.', width: '150px', align: 'left' },
            { label: 'Due Date', width: '100px', align: 'center' },
            { label: 'Amount', width: '100px', align: 'right' },
            { label: 'Paid Date', width: '100px', align: 'center' },
            { label: 'Receipt No', width: '100px', align: 'center' },
            { label: 'Discount', width: '80px', align: 'right' },
            { label: 'Status', width: '80px', align: 'center' }
        ];
    };

    const columns = getColumns();

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
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <style jsx global>{`
                @media print {
                    @page {
                        size: 8.5in 11in;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
            {/* 1️⃣ Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                    {schoolLogo && (
                        <div style={{ width: '60px', height: '60px' }}>
                            <img src={schoolLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    )}
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#8B0000', textTransform: 'uppercase' }}>{schoolName}</h1>
                        <p style={{ margin: '2px 0', fontSize: '10px' }}>{schoolAddress}</p>
                        <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '5px' }}>STUDENT FEE STATEMENT</h2>
                        <p style={{ fontSize: '11px' }}>Academic Year: <b>{academicYear}</b></p>
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px' }}>
                    <p style={{ margin: '2px 0' }}>Generated On: <b>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b></p>
                    {/* Optional generation ID */}
                </div>
            </div>

            {/* 2️⃣ Student Details */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '40px' }}>
                <div style={{ flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold', width: '100px' }}>Student Name:</td>
                                <td style={{ padding: '4px 0' }}>{studentName}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Admission No:</td>
                                <td style={{ padding: '4px 0' }}>{admissionNo}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Fee Structure:</td>
                                <td style={{ padding: '4px 0' }}>{feeStructureName}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style={{ flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold', width: '100px' }}>Class / Section:</td>
                                <td style={{ padding: '4px 0' }}>{className} - {sectionName}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Roll No:</td>
                                <td style={{ padding: '4px 0' }}>{rollNo || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3️⃣ Fee Summary */}
            <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px' }}>FEE SUMMARY</h3>
                <div style={{ display: 'flex', gap: '1px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
                    <div style={{ flex: 1, padding: '10px 15px', borderRight: '1px solid #ddd' }}>
                        <div style={{ fontSize: '10px', color: '#666' }}>Total Fee</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>₹{totalFee.toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 15px', borderRight: '1px solid #ddd' }}>
                        <div style={{ fontSize: '10px', color: '#666' }}>Total Paid</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'green' }}>₹{totalPaid.toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 15px', borderRight: '1px solid #ddd' }}>
                        <div style={{ fontSize: '10px', color: '#666' }}>Total Discount</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'blue' }}>₹{totalDiscount.toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 15px' }}>
                        <div style={{ fontSize: '10px', color: '#666' }}>Balance Due</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: balanceDue > 0 ? 'red' : 'black' }}>₹{balanceDue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* 4️⃣ Installment Ledger */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px' }}>INSTALLMENT LEDGER</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ccc' }}>
                            {columns.map((col, idx) => (
                                <th key={idx} style={{ padding: '8px', textAlign: col.align, width: col.width, fontWeight: 'bold' }}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ledgerData.length > 0 ? (
                            ledgerData.map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px', textAlign: 'left' }}>
                                        <div style={{ fontWeight: 'bold' }}>{row.descriptor}</div>
                                        <div style={{ fontSize: '9px', color: '#666' }}>{row.subDescriptor}</div>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>{row.dueDate}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>₹{row.amount.toLocaleString()}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>{row.paidDate || '—'}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>{row.receiptNo || '—'}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{row.discount > 0 ? `₹${row.discount}` : '—'}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: row.status === 'Paid' ? '#dcfce7' : row.status === 'Partial' ? '#fef9c3' : '#fee2e2',
                                            color: row.status === 'Paid' ? '#166534' : row.status === 'Partial' ? '#854d0e' : '#991b1b',
                                            fontWeight: 'bold',
                                            fontSize: '9px'
                                        }}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No ledger data available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }}></div>

            {/* 5️⃣ Receipt Mapping */}
            {receiptsList.length > 0 && (
                <div style={{ marginBottom: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>Payment History (Details)</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {receiptsList.map((rec, idx) => (
                            <div key={idx} style={{ fontSize: '9px', backgroundColor: '#f9f9f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #eee' }}>
                                <b>{rec.number}</b> | {rec.date} | ₹{rec.amount.toLocaleString()} | {rec.mode}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 6️⃣ Footer */}
            <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginTop: '10px' }}>
                <p>This is a computer-generated fee statement. For any discrepancy, please contact the school office.</p>
            </div>
        </div>
    );
});

FeeStatementTemplate.displayName = 'FeeStatementTemplate';

export default FeeStatementTemplate;
