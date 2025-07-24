const schoolSchema = {
  id: "uuid",
  name: "Sunshine Public School",
  location: "Delhi, India",
  currentDomain: "sunshinepublic.in",
  customDomain: "sunshinepublic.edubreezy.com",
  type: "Private", // e.g. Government, International
  subscriptionType:"A", // a/b/c
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    timezone: "Asia/Kolkata",
    language: "en" //en/hindi/Bengali/Tamil/Telugu/ Odia/ Kannad/ malyali/marathi/gujrati/Punjabi
  },
  profiles: [],   // Array of profile objects (see below) admin/teacher/students
  users: [],      // Array of user IDs
};


const profileSchema = {
  id: "uuid",
  role: "Teacher",        // e.g. SuperAdmin, Accountant, Librarian, etc.
  permissions: [          // Example of granular permissions
    "manage_students",
    "mark_attendance",
    "create_exams",
    "view_reports"
  ],
  assignedUsers: [],      // array of user IDs
  meta: {},               // Extra struct for role-specific data
};


const userSchema = {
  id: "uuid",
  name: "Ravi Sharma",
  email: "ravi@school.com",
  dob: "2000-05-25",
  mobile: "9876543210",
  bloodGroup: "O+",
  address: "Somewhere, India",
  profileIds: [],      // References to profileSchema entries
  schoolId: "school-uuid",
  meta: {
    certificates: ["B.Ed", "M.A. English"],
    classAssigned: "8-A",   // for teachers
    vehicleAssigned: "Bus-12" // for drivers
  }
};

const studentSchema = {
  id: "uuid",
  name: "Aman Gupta",
  class: "5-B",
  teacherId: "user-uuid",
  dob: "2012-03-15",
  location: "Ranchi",
  bloodGroup: "A+",
  results: [
    { subject: "Math", marks: 92 },
    { subject: "Science", marks: 89 }
  ],
  parentIds: [],      // Array of parent IDs
  schoolId: "school-uuid",
};

const parentSchema = {
  id: "uuid",
  fatherName: "Suresh Gupta",
  motherName: "Rita Gupta",
  children: [
    {
      studentId: "student-uuid",
      class: "5-B",
      teacherId: "user-uuid"
    }
  ],
  contact: {
    email: "parent@example.com",
    phone: "9876543210"
  },
  schoolId: "school-uuid",
};


const busDriverProfile = {
  id: "uuid",
  name: "Raj Kumar",
  email: "raj@school.com",
  address: "Street No. 1, Hazaribagh",
  dob: "1980-07-12",
  bloodGroup: "B+",
  busNumber: "JH02AB1234",
  studentCount: 35,
  profileId: "profile-uuid",
  schoolId: "school-uuid"
};




// master admin 



table for all schools onboarded 