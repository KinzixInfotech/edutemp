// Bank Slip Generator for Payroll
// Generates CSV/Excel file for bank transfers

/**
 * Generate bank transfer data for NEFT/RTGS
 * @param {Array} payrollItems - Array of payroll items with employee details
 * @param {Object} period - Payroll period details
 * @param {Object} school - School details for payment reference
 * @returns {Object} - CSV content and metadata
 */
export function generateBankSlipData(payrollItems, period, school) {
    const monthName = new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' });
    const reference = `SAL-${school.code || 'SCH'}-${period.month.toString().padStart(2, '0')}${period.year}`;

    // Filter valid items with bank details
    const validItems = payrollItems.filter(item =>
        item.employee?.accountNumber &&
        item.employee?.ifscCode &&
        item.netSalary > 0 &&
        item.paymentStatus !== 'PROCESSED'
    );

    // CSV Headers (Bank transfer format)
    const headers = [
        'Sr No',
        'Beneficiary Name',
        'Account Number',
        'IFSC Code',
        'Bank Name',
        'Branch',
        'Amount',
        'Payment Mode',
        'Reference',
        'Remarks'
    ];

    // Generate rows
    const rows = validItems.map((item, index) => {
        const emp = item.employee;
        const user = emp.user || {};

        return [
            index + 1,
            emp.accountHolder || user.name || 'N/A',
            emp.accountNumber,
            emp.ifscCode,
            emp.bankName || 'N/A',
            emp.bankBranch || 'N/A',
            item.netSalary.toFixed(2),
            item.netSalary >= 200000 ? 'RTGS' : 'NEFT',
            `${reference}-${(index + 1).toString().padStart(4, '0')}`,
            `Salary ${monthName} ${period.year}`
        ];
    });

    // Calculate totals
    const totalAmount = validItems.reduce((sum, item) => sum + item.netSalary, 0);
    const neftCount = validItems.filter(item => item.netSalary < 200000).length;
    const rtgsCount = validItems.filter(item => item.netSalary >= 200000).length;

    return {
        headers,
        rows,
        summary: {
            totalEmployees: validItems.length,
            totalAmount,
            neftCount,
            rtgsCount,
            skipped: payrollItems.length - validItems.length,
            reference,
            period: `${monthName} ${period.year}`
        },
        filename: `BankSlip_${school.code || 'School'}_${monthName}_${period.year}.csv`
    };
}

/**
 * Convert data to CSV string
 * @param {Array} headers - Column headers
 * @param {Array} rows - Data rows
 * @returns {string} - CSV content
 */
export function toCSV(headers, rows) {
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerRow = headers.map(escapeCSV).join(',');
    const dataRows = rows.map(row => row.map(escapeCSV).join(','));

    return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate Excel-compatible XML format
 * @param {Array} headers - Column headers
 * @param {Array} rows - Data rows
 * @param {Object} summary - Summary data
 * @returns {string} - XML spreadsheet content
 */
export function toExcelXML(headers, rows, summary) {
    const escapeXML = (value) => {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    const headerCells = headers.map(h =>
        `<Cell><Data ss:Type="String">${escapeXML(h)}</Data></Cell>`
    ).join('');

    const dataCells = rows.map(row => {
        const cells = row.map((cell, i) => {
            const type = typeof cell === 'number' ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${escapeXML(cell)}</Data></Cell>`;
        }).join('');
        return `<Row>${cells}</Row>`;
    }).join('\n');

    // Summary row
    const summaryRow = `
        <Row></Row>
        <Row>
            <Cell><Data ss:Type="String">Total Employees:</Data></Cell>
            <Cell><Data ss:Type="Number">${summary.totalEmployees}</Data></Cell>
        </Row>
        <Row>
            <Cell><Data ss:Type="String">Total Amount:</Data></Cell>
            <Cell><Data ss:Type="Number">${summary.totalAmount.toFixed(2)}</Data></Cell>
        </Row>
        <Row>
            <Cell><Data ss:Type="String">NEFT Transactions:</Data></Cell>
            <Cell><Data ss:Type="Number">${summary.neftCount}</Data></Cell>
        </Row>
        <Row>
            <Cell><Data ss:Type="String">RTGS Transactions:</Data></Cell>
            <Cell><Data ss:Type="Number">${summary.rtgsCount}</Data></Cell>
        </Row>
    `;

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="Bank Transfer">
        <Table>
            <Row ss:StyleID="Header">${headerCells}</Row>
            ${dataCells}
            ${summaryRow}
        </Table>
    </Worksheet>
</Workbook>`;
}
