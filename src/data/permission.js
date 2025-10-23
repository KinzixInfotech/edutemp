//  permission  matrix to check the user role

export const permissions = {
    // master admin for kinzix  owners
    "master-admin": {
        manageSchool: true,
        viewAllData: true,
        manageTeachers: true,
        assignClass: true,
        markAttendance: true,
        uploadHomework: true,
        sendNotification: true,
        viewOwnSalary: true,
        accessTimetable: true,
        enterMarks: true,
        viewMarks: true,
        manageGallery: true,
        payFees: true,
        addStudents: true,
    },
    // admin school
    "admin": {
        manageSchool: true,
        viewAllData: true,
        manageTeachers: true,
        assignClass: true,
        markAttendance: true,
        uploadHomework: true,
        sendNotification: true,
        viewOwnSalary: true,
        addStudents: true,  // user can ddd,delete,update,remove based on the bool here
        accessTimetable: true,
        enterMarks: true,
        viewMarks: true,
        manageGallery: true,
        payFees: true,
    },
    "teacher": {
        manageSchool: false,
        viewAllData: false,
        markAttendance: true,
        uploadHomework: true,
        sendNotification: true,
        viewOwnSalary: true,
        accessTimetable: true,
        enterMarks: true,
        viewMarks: true,
        manageGallery: true,
    },
    "non-teaching": {
        viewOwnSalary: true,
        getNotifications: true,
    },
    "student": {
        accessTimetable: true,
        viewMarks: true,
        getNotifications: true,
        viewHomework: true,
        viewGallery: true, // students can only se
        chat: true,  // student can talk to teacher only
    },
    "parent": {
        accessTimetable: true,
        payFees: true,
        viewMarks: true,
        getNotifications: true,
    },
    "accountant": {
        viewOwnSalary: true,
        payFees: true,
        recieptgenerator: true,
    },
};