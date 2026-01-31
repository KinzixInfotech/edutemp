// Professional Payslip PDF Generator
// Uses @react-pdf/renderer for server-side PDF generation

import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font
} from '@react-pdf/renderer';

// Register fonts (optional - uses default if not registered)
// Font.register({ family: 'Roboto', src: '/fonts/Roboto-Regular.ttf' });

// Styles for the payslip
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#1a365d'
    },
    schoolName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a365d'
    },
    schoolAddress: {
        fontSize: 9,
        color: '#4a5568',
        marginTop: 4
    },
    payslipTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#1a365d'
    },
    monthYear: {
        fontSize: 11,
        textAlign: 'right',
        color: '#718096',
        marginTop: 4
    },

    // Employee Info Section
    employeeSection: {
        flexDirection: 'row',
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f7fafc',
        borderRadius: 4
    },
    employeeColumn: {
        flex: 1
    },
    label: {
        fontSize: 8,
        color: '#718096',
        marginBottom: 2,
        textTransform: 'uppercase'
    },
    value: {
        fontSize: 10,
        color: '#2d3748',
        marginBottom: 8
    },

    // Earnings & Deductions
    tableContainer: {
        flexDirection: 'row',
        marginBottom: 20
    },
    tableColumn: {
        flex: 1,
        marginRight: 10
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1a365d',
        padding: 8,
        marginBottom: 1
    },
    tableHeaderText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        flex: 1
    },
    tableHeaderAmount: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        width: 80,
        textAlign: 'right'
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#f7fafc',
        marginBottom: 1
    },
    tableRowAlt: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#edf2f7',
        marginBottom: 1
    },
    tableCell: {
        fontSize: 9,
        color: '#4a5568',
        flex: 1
    },
    tableCellAmount: {
        fontSize: 9,
        color: '#2d3748',
        width: 80,
        textAlign: 'right'
    },
    tableFooter: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#e2e8f0',
        borderTopWidth: 1,
        borderTopColor: '#cbd5e0'
    },
    tableFooterText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2d3748',
        flex: 1
    },
    tableFooterAmount: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1a365d',
        width: 80,
        textAlign: 'right'
    },

    // Net Salary Section
    netSalarySection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#1a365d',
        borderRadius: 4,
        marginBottom: 20
    },
    netSalaryLabel: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: 'bold'
    },
    netSalaryAmount: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 'bold'
    },
    netSalaryWords: {
        fontSize: 9,
        color: '#a0aec0',
        marginTop: 4
    },

    // Bank Details
    bankSection: {
        flexDirection: 'row',
        backgroundColor: '#f7fafc',
        padding: 12,
        borderRadius: 4,
        marginBottom: 20
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },
    footerText: {
        fontSize: 8,
        color: '#a0aec0'
    },
    signature: {
        textAlign: 'right'
    },
    signatureLine: {
        width: 100,
        borderTopWidth: 1,
        borderTopColor: '#718096',
        marginBottom: 4
    },
    signatureLabel: {
        fontSize: 8,
        color: '#718096'
    }
});

// Number to words converter (Indian format)
function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(-num);

    let words = '';

    if (Math.floor(num / 10000000) > 0) {
        words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
        num %= 10000000;
    }
    if (Math.floor(num / 100000) > 0) {
        words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
        num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
        words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
        words += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
    }
    if (num > 0) {
        if (num < 20) {
            words += ones[num];
        } else {
            words += tens[Math.floor(num / 10)];
            if (num % 10 > 0) {
                words += ' ' + ones[num % 10];
            }
        }
    }

    return words.trim();
}

// Format currency
const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Payslip Document Component
const PayslipDocument = ({ payslip, school, employee, period }) => {
    const monthName = new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' });

    const earnings = payslip.earnings || [];
    const deductions = payslip.deductions || [];
    const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
    const netSalary = payslip.netSalary || (totalEarnings - totalDeductions);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.schoolName}>{school.name}</Text>
                        <Text style={styles.schoolAddress}>{school.address || 'School Address'}</Text>
                    </View>
                    <View>
                        <Text style={styles.payslipTitle}>PAYSLIP</Text>
                        <Text style={styles.monthYear}>{monthName} {period.year}</Text>
                    </View>
                </View>

                {/* Employee Info */}
                <View style={styles.employeeSection}>
                    <View style={styles.employeeColumn}>
                        <Text style={styles.label}>Employee Name</Text>
                        <Text style={styles.value}>{employee.name || 'N/A'}</Text>

                        <Text style={styles.label}>Employee ID</Text>
                        <Text style={styles.value}>{employee.employeeId || 'N/A'}</Text>

                        <Text style={styles.label}>Designation</Text>
                        <Text style={styles.value}>{employee.designation || 'N/A'}</Text>
                    </View>
                    <View style={styles.employeeColumn}>
                        <Text style={styles.label}>Department</Text>
                        <Text style={styles.value}>{employee.department || 'N/A'}</Text>

                        <Text style={styles.label}>PAN</Text>
                        <Text style={styles.value}>{employee.panNumber || 'N/A'}</Text>

                        <Text style={styles.label}>Working Days</Text>
                        <Text style={styles.value}>{payslip.workingDays || period.totalWorkingDays} / {period.totalWorkingDays}</Text>
                    </View>
                </View>

                {/* Earnings & Deductions Table */}
                <View style={styles.tableContainer}>
                    {/* Earnings Column */}
                    <View style={styles.tableColumn}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.tableHeaderText}>EARNINGS</Text>
                            <Text style={styles.tableHeaderAmount}>AMOUNT</Text>
                        </View>
                        {earnings.map((earning, index) => (
                            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                                <Text style={styles.tableCell}>{earning.name}</Text>
                                <Text style={styles.tableCellAmount}>{formatCurrency(earning.amount)}</Text>
                            </View>
                        ))}
                        <View style={styles.tableFooter}>
                            <Text style={styles.tableFooterText}>Total Earnings</Text>
                            <Text style={styles.tableFooterAmount}>{formatCurrency(totalEarnings)}</Text>
                        </View>
                    </View>

                    {/* Deductions Column */}
                    <View style={{ ...styles.tableColumn, marginRight: 0 }}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.tableHeaderText}>DEDUCTIONS</Text>
                            <Text style={styles.tableHeaderAmount}>AMOUNT</Text>
                        </View>
                        {deductions.map((deduction, index) => (
                            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                                <Text style={styles.tableCell}>{deduction.name}</Text>
                                <Text style={styles.tableCellAmount}>{formatCurrency(deduction.amount)}</Text>
                            </View>
                        ))}
                        <View style={styles.tableFooter}>
                            <Text style={styles.tableFooterText}>Total Deductions</Text>
                            <Text style={styles.tableFooterAmount}>{formatCurrency(totalDeductions)}</Text>
                        </View>
                    </View>
                </View>

                {/* Net Salary */}
                <View style={styles.netSalarySection}>
                    <View>
                        <Text style={styles.netSalaryLabel}>NET SALARY</Text>
                        <Text style={styles.netSalaryWords}>
                            {numberToWords(Math.round(netSalary))} Rupees Only
                        </Text>
                    </View>
                    <Text style={styles.netSalaryAmount}>{formatCurrency(netSalary)}</Text>
                </View>

                {/* Bank Details */}
                <View style={styles.bankSection}>
                    <View style={styles.employeeColumn}>
                        <Text style={styles.label}>Bank Name</Text>
                        <Text style={styles.value}>{employee.bankName || 'N/A'}</Text>
                    </View>
                    <View style={styles.employeeColumn}>
                        <Text style={styles.label}>Account Number</Text>
                        <Text style={styles.value}>{employee.accountNumber ? `****${employee.accountNumber.slice(-4)}` : 'N/A'}</Text>
                    </View>
                    <View style={styles.employeeColumn}>
                        <Text style={styles.label}>IFSC Code</Text>
                        <Text style={styles.value}>{employee.ifscCode || 'N/A'}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerText}>This is a computer generated payslip and does not require signature.</Text>
                        <Text style={styles.footerText}>Generated on: {new Date().toLocaleDateString('en-IN')}</Text>
                    </View>
                    <View style={styles.signature}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Authorized Signatory</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

/**
 * Generate PDF buffer for a payslip
 * @param {Object} data - Payslip data including school, employee, period info
 * @returns {Promise<Buffer>} - PDF buffer
 */
export async function generatePayslipPDF(data) {
    const { payslip, school, employee, period } = data;

    const pdfBuffer = await renderToBuffer(
        <PayslipDocument
            payslip={payslip}
            school={school}
            employee={employee}
            period={period}
        />
    );

    return pdfBuffer;
}

/**
 * Generate filename for payslip
 */
export function getPayslipFilename(employee, period) {
    const monthName = new Date(period.year, period.month - 1).toLocaleString('default', { month: 'short' });
    const safeName = (employee.name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    return `Payslip_${safeName}_${monthName}_${period.year}.pdf`;
}
