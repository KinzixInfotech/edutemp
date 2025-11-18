// lib/exportUtils.js
import * as XLSX from 'xlsx';

// Helper function to download Excel file
const downloadExcel = (workbook, filename) => {
    try {
        console.log('Starting Excel download:', filename);
        
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        console.log('Workbook written, size:', wbout.byteLength);
        
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        console.log('Blob created, size:', blob.size);
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        console.log('URL created:', url);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        console.log('Link added to body');
        
        link.click();
        console.log('Link clicked');
        
        // Cleanup after a short delay
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log('Cleanup completed');
        }, 100);
        
        return true;
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
};

// Export Summary Report
export const exportSummaryToExcel = (data, dateRange) => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Overview
    const overviewData = [
        ['ATTENDANCE SUMMARY REPORT'],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        ['Generated:', new Date().toLocaleString()],
        [],
        ['Metric', 'Value'],
        ['Total Days', data.overview?.totalDays || 0],
        ['Total Present', data.overview?.totalPresent || 0],
        ['Total Absent', data.overview?.totalAbsent || 0],
        ['Total Late', data.overview?.totalLate || 0],
        ['Average Attendance %', `${data.overview?.avgAttendancePercentage || 0}%`],
        [],
        ['CLASS SUMMARY'],
        ['Total Classes', data.classSummary?.totalClasses || 0],
        ['Average Class Attendance %', `${data.classSummary?.avgAttendance || 0}%`],
        [],
        ['TEACHER SUMMARY'],
        ['Total Teachers', data.teacherSummary?.totalTeachers || 0],
        ['Average Working Hours', `${data.teacherSummary?.avgWorkingHours || 0}h`],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Overview');

    // Sheet 2: Leave Summary
    if (data.leaveSummary && Object.keys(data.leaveSummary).length > 0) {
        const leaveData = [
            ['LEAVE SUMMARY'],
            [],
            ['Leave Type', 'Approved', 'Rejected', 'Pending', 'Total Days']
        ];
        
        Object.entries(data.leaveSummary).forEach(([type, stats]) => {
            leaveData.push([
                type,
                stats.approved || 0,
                stats.rejected || 0,
                stats.pending || 0,
                stats.days || 0
            ]);
        });
        
        const ws2 = XLSX.utils.aoa_to_sheet(leaveData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Leave Summary');
    }

    // Generate and download
    downloadExcel(wb, `Summary_Report_${dateRange.start}_${dateRange.end}.xlsx`);
};

// Export Monthly Report
export const exportMonthlyToExcel = (data, dateRange) => {
    const wb = XLSX.utils.book_new();

    // Daily Statistics
    const dailyData = [
        ['MONTHLY ATTENDANCE REPORT'],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        [],
        ['Date', 'Present', 'Absent', 'Late', 'On Leave', 'Half Day', 'Total']
    ];

    data.dailyStats?.forEach(day => {
        dailyData.push([
            new Date(day.date).toLocaleDateString('en-IN'),
            day.present,
            day.absent,
            day.late,
            day.onLeave,
            day.halfDay || 0,
            day.total
        ]);
    });

    // Add summary at the end
    dailyData.push([]);
    dailyData.push(['SUMMARY']);
    dailyData.push(['Total Days', data.summary?.totalDays || 0]);
    dailyData.push(['Total Present', data.summary?.totalPresent || 0]);
    dailyData.push(['Total Absent', data.summary?.totalAbsent || 0]);
    dailyData.push(['Total Late', data.summary?.totalLate || 0]);
    dailyData.push(['Average Attendance %', `${data.summary?.avgAttendancePercentage || 0}%`]);

    const ws = XLSX.utils.aoa_to_sheet(dailyData);
    
    // Style header rows
    ws['A1'].s = { font: { bold: true, sz: 14 } };
    
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Attendance');

    downloadExcel(wb, `Monthly_Report_${dateRange.start}_${dateRange.end}.xlsx`);
};

// Export Class-wise Report
export const exportClassWiseToExcel = (data, dateRange) => {
    const wb = XLSX.utils.book_new();

    const classData = [
        ['CLASS-WISE ATTENDANCE REPORT'],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        [],
        ['Class', 'Total Students', 'Present', 'Absent', 'Late', 'On Leave', 'Half Day', 'Attendance %']
    ];

    data.classes?.forEach(cls => {
        classData.push([
            cls.className,
            cls.totalStudents,
            cls.present,
            cls.absent,
            cls.late,
            cls.onLeave,
            cls.halfDay || 0,
            `${cls.attendancePercentage}%`
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(classData);
    
    // Auto-width columns
    const wscols = [
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 }
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Class-wise Report');

    downloadExcel(wb, `ClassWise_Report_${dateRange.start}_${dateRange.end}.xlsx`);
};

// Export Student-wise Report
export const exportStudentWiseToExcel = (data, dateRange) => {
    const wb = XLSX.utils.book_new();

    // Main sheet with summary
    const studentData = [
        ['STUDENT-WISE ATTENDANCE REPORT'],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        [],
        ['Roll No', 'Admission No', 'Name', 'Class', 'Section', 'Present', 'Absent', 'Late', 'Leaves', 'Total', 'Percentage']
    ];

    data.students?.forEach(student => {
        studentData.push([
            student.rollNumber,
            student.admissionNo,
            student.name,
            student.className,
            student.sectionName || '-',
            student.attendance?.present || 0,
            student.attendance?.absent || 0,
            student.attendance?.late || 0,
            student.attendance?.leaves || 0,
            student.attendance?.total || 0,
            `${student.attendance?.percentage || 0}%`
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(studentData);
    
    // Auto-width columns
    ws['!cols'] = Array(11).fill({ wch: 15 });

    XLSX.utils.book_append_sheet(wb, ws, 'Student Attendance');

    downloadExcel(wb, `StudentWise_Report_${dateRange.start}_${dateRange.end}.xlsx`);
};

// Export Teacher Performance Report
export const exportTeacherToExcel = (data, dateRange) => {
    const wb = XLSX.utils.book_new();

    const teacherData = [
        ['TEACHER PERFORMANCE REPORT'],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        [],
        ['Employee ID', 'Name', 'Designation', 'Department', 'Present Days', 'Late Days', 'Total Hours', 'Avg Hours', 'Avg Late (min)', 'Streak', 'Attendance %']
    ];

    data.teachers?.forEach(teacher => {
        teacherData.push([
            teacher.employeeId,
            teacher.name,
            teacher.designation,
            teacher.department || '-',
            teacher.presentDays,
            teacher.lateDays,
            Number(teacher.totalHours || 0).toFixed(2),
            Number(teacher.avgHours || 0).toFixed(2),
            teacher.avgLateMinutes,
            teacher.streak,
            `${teacher.attendancePercentage}%`
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(teacherData);
    ws['!cols'] = Array(11).fill({ wch: 15 });

    XLSX.utils.book_append_sheet(wb, ws, 'Teacher Performance');

    downloadExcel(wb, `Teacher_Performance_${dateRange.start}_${dateRange.end}.xlsx`);
};

// Export Defaulters Report
export const exportDefaultersToExcel = (data, dateRange) => {
    const wb = XLSX.utils.book_new();

    const defaultersData = [
        ['DEFAULTERS REPORT (Below 75%)'],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        ['Total Defaulters:', data.count || 0],
        [],
        ['Type', 'ID', 'Name', 'Class/Designation', 'Section', 'Contact', 'Parent Name', 'Present', 'Absent', 'Late', 'Percentage', 'Month', 'Year']
    ];

    data.defaulters?.forEach(person => {
        defaultersData.push([
            person.userType,
            person.userType === 'Student' ? person.admissionNo : person.employeeId,
            person.name,
            person.userType === 'Student' ? person.className : person.designation,
            person.sectionName || '-',
            person.contactNumber || person.email || '-',
            person.parentName || '-',
            person.totalPresent,
            person.totalAbsent,
            person.totalLate,
            `${person.attendancePercentage}%`,
            person.month,
            person.year
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(defaultersData);
    ws['!cols'] = Array(13).fill({ wch: 15 });

    // Highlight header row
    ws['A1'].s = { font: { bold: true, sz: 14, color: { rgb: 'FF0000' } } };

    XLSX.utils.book_append_sheet(wb, ws, 'Defaulters');

    downloadExcel(wb, `Defaulters_Report_${dateRange.start}_${dateRange.end}.xlsx`);
};

// Export Leave Analysis Report
export const exportLeaveAnalysisToExcel = (data, dateRange) => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
        ['LEAVE ANALYSIS REPORT'],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        ['Total Requests:', data.totalRequests || 0],
        ['Total Days:', data.totalDays || 0],
        [],
        ['Leave Type Summary'],
        ['Type', 'Approved', 'Rejected', 'Pending', 'Total Days']
    ];

    if (data.summary) {
        Object.entries(data.summary).forEach(([type, stats]) => {
            summaryData.push([
                type,
                stats.approved || 0,
                stats.rejected || 0,
                stats.pending || 0,
                stats.days || 0
            ]);
        });
    }

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: Detailed Requests
    const requestsData = [
        ['DETAILED LEAVE REQUESTS'],
        [],
        ['Name', 'Role', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason']
    ];

    data.requests?.forEach(leave => {
        requestsData.push([
            leave.userName,
            leave.userRole,
            leave.leaveType,
            new Date(leave.startDate).toLocaleDateString('en-IN'),
            new Date(leave.endDate).toLocaleDateString('en-IN'),
            leave.totalDays,
            leave.status,
            leave.reason || '-'
        ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(requestsData);
    ws2['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 12 },
        { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws2, 'Detailed Requests');

    downloadExcel(wb, `Leave_Analysis_${dateRange.start}_${dateRange.end}.xlsx`);
};