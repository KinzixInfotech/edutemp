-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."FeeStatus" AS ENUM ('PAID', 'UNPAID', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEFT', 'DISABLED', 'BANNED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('NOTE', 'ASSIGNMENT', 'CERTIFICATE', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "public"."FeeMode" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateTable
CREATE TABLE "public"."School" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "profilePicture" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "SubscriptionType" TEXT NOT NULL,
    "Language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "schoolId" UUID,
    "roleId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "profilePicture" TEXT NOT NULL DEFAULT 'default.png',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Admin" (
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."MasterAdmin" (
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "MasterAdmin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Student" (
    "userId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "admissionDate" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "PreviousSchoolName" TEXT,
    "FeeStatus" "public"."FeeStatus" NOT NULL DEFAULT 'PENDING',
    "DateOfLeaving" TEXT,
    "contactNumber" TEXT NOT NULL,
    "Address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "FatherName" TEXT NOT NULL,
    "MotherName" TEXT NOT NULL,
    "FatherNumber" TEXT,
    "MotherNumber" TEXT,
    "GuardianName" TEXT,
    "GuardianRelation" TEXT,
    "House" TEXT,
    "admissionNo" TEXT NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."ExamSeries" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ExamSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExamIssue" (
    "id" SERIAL NOT NULL,
    "studentId" UUID NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vehicle" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomeworkSubmission" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "studentId" UUID NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeachingStaff" (
    "userId" UUID NOT NULL,
    "departmentId" INTEGER,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "City" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT,
    "country" TEXT,
    "PostalCode" TEXT,
    "subjectId" INTEGER,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "TeachingStaff_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."NonTeachingStaff" (
    "userId" UUID NOT NULL,
    "departmentId" INTEGER,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "City" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT,
    "country" TEXT,
    "PostalCode" TEXT,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "NonTeachingStaff_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Class" (
    "id" SERIAL NOT NULL,
    "schoolId" UUID NOT NULL,
    "className" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "teachingStaffUserId" UUID,
    "academicYearId" UUID,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Section" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "schoolId" UUID NOT NULL,
    "teachingStaffUserId" UUID,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SectionSubjectTeacher" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teachingStaffUserId" UUID NOT NULL,

    CONSTRAINT "SectionSubjectTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Timetable" (
    "id" UUID NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL DEFAULT 'OTHER',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" SERIAL NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectCode" TEXT,
    "classId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Homework" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" UUID NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Exam" (
    "id" SERIAL NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExamResult" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "studentId" UUID NOT NULL,
    "subjectId" INTEGER NOT NULL,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AcademicYear" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeeStructure" (
    "id" UUID NOT NULL,
    "schoolId" UUID,
    "academicYearId" UUID NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentUserId" UUID,
    "classId" INTEGER,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeeParticular" (
    "id" UUID NOT NULL,
    "feeStructureId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FeeParticular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentFeeStructure" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" UUID,
    "studentUserId" UUID,

    CONSTRAINT "StudentFeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentFeeParticular" (
    "id" UUID NOT NULL,
    "studentFeeStructureId" UUID NOT NULL,
    "globalParticularId" UUID NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'unpaid',

    CONSTRAINT "StudentFeeParticular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeePayment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "feeStructureId" UUID,
    "studentFeeStructureId" UUID,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMode" TEXT NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attendance" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "senderId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transport" (
    "id" SERIAL NOT NULL,
    "schoolId" UUID NOT NULL,
    "route" TEXT,
    "vehicleId" INTEGER,

    CONSTRAINT "Transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LibraryBook" (
    "id" SERIAL NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Gallery" (
    "id" SERIAL NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" UUID,
    "action" "public"."AuditAction" NOT NULL,
    "tableName" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldData" JSONB,
    "newData" JSONB,
    "error" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_SubjectToTeachingStaff" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_SubjectToTeachingStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_domain_key" ON "public"."School"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "School_schoolCode_key" ON "public"."School"("schoolCode");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "public"."School"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "public"."User"("schoolId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "public"."User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAdmin_userId_key" ON "public"."MasterAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAdmin_schoolId_key" ON "public"."MasterAdmin"("schoolId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "public"."Student"("classId");

-- CreateIndex
CREATE INDEX "Student_sectionId_idx" ON "public"."Student"("sectionId");

-- CreateIndex
CREATE INDEX "Student_parentId_idx" ON "public"."Student"("parentId");

-- CreateIndex
CREATE INDEX "TeachingStaff_departmentId_idx" ON "public"."TeachingStaff"("departmentId");

-- CreateIndex
CREATE INDEX "NonTeachingStaff_departmentId_idx" ON "public"."NonTeachingStaff"("departmentId");

-- CreateIndex
CREATE INDEX "Class_schoolId_idx" ON "public"."Class"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_id_schoolId_key" ON "public"."Class"("id", "schoolId");

-- CreateIndex
CREATE INDEX "Section_classId_idx" ON "public"."Section"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_name_key" ON "public"."Section"("classId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SectionSubjectTeacher_sectionId_subjectId_key" ON "public"."SectionSubjectTeacher"("sectionId", "subjectId");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "public"."Document"("userId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "public"."Document"("type");

-- CreateIndex
CREATE INDEX "Subject_classId_idx" ON "public"."Subject"("classId");

-- CreateIndex
CREATE INDEX "Subject_departmentId_idx" ON "public"."Subject"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "public"."Department"("name");

-- CreateIndex
CREATE INDEX "Homework_classId_idx" ON "public"."Homework"("classId");

-- CreateIndex
CREATE INDEX "Homework_subjectId_idx" ON "public"."Homework"("subjectId");

-- CreateIndex
CREATE INDEX "Homework_teacherId_idx" ON "public"."Homework"("teacherId");

-- CreateIndex
CREATE INDEX "Exam_schoolId_idx" ON "public"."Exam"("schoolId");

-- CreateIndex
CREATE INDEX "ExamResult_examId_idx" ON "public"."ExamResult"("examId");

-- CreateIndex
CREATE INDEX "ExamResult_studentId_idx" ON "public"."ExamResult"("studentId");

-- CreateIndex
CREATE INDEX "ExamResult_subjectId_idx" ON "public"."ExamResult"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_examId_studentId_subjectId_key" ON "public"."ExamResult"("examId", "studentId", "subjectId");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_idx" ON "public"."AcademicYear"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "public"."AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "FeePayment_schoolId_idx" ON "public"."FeePayment"("schoolId");

-- CreateIndex
CREATE INDEX "FeePayment_academicYearId_idx" ON "public"."FeePayment"("academicYearId");

-- CreateIndex
CREATE INDEX "FeePayment_studentId_idx" ON "public"."FeePayment"("studentId");

-- CreateIndex
CREATE INDEX "FeePayment_feeStructureId_idx" ON "public"."FeePayment"("feeStructureId");

-- CreateIndex
CREATE INDEX "FeePayment_studentFeeStructureId_idx" ON "public"."FeePayment"("studentFeeStructureId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "public"."Attendance"("userId", "date");

-- CreateIndex
CREATE INDEX "Notification_receiverId_idx" ON "public"."Notification"("receiverId");

-- CreateIndex
CREATE INDEX "Notification_senderId_idx" ON "public"."Notification"("senderId");

-- CreateIndex
CREATE INDEX "Transport_schoolId_idx" ON "public"."Transport"("schoolId");

-- CreateIndex
CREATE INDEX "LibraryBook_schoolId_idx" ON "public"."LibraryBook"("schoolId");

-- CreateIndex
CREATE INDEX "Gallery_schoolId_idx" ON "public"."Gallery"("schoolId");

-- CreateIndex
CREATE INDEX "_SubjectToTeachingStaff_B_index" ON "public"."_SubjectToTeachingStaff"("B");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Admin" ADD CONSTRAINT "Admin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterAdmin" ADD CONSTRAINT "MasterAdmin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterAdmin" ADD CONSTRAINT "MasterAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamSeries" ADD CONSTRAINT "ExamSeries_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamIssue" ADD CONSTRAINT "ExamIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "public"."Homework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeachingStaff" ADD CONSTRAINT "TeachingStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeachingStaff" ADD CONSTRAINT "TeachingStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeachingStaff" ADD CONSTRAINT "TeachingStaff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Section" ADD CONSTRAINT "Section_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Timetable" ADD CONSTRAINT "Timetable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subject" ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subject" ADD CONSTRAINT "Subject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Homework" ADD CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Homework" ADD CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeStructure" ADD CONSTRAINT "FeeStructure_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "public"."Student"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeStructure" ADD CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeStructure" ADD CONSTRAINT "FeeStructure_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeParticular" ADD CONSTRAINT "FeeParticular_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "public"."FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "public"."Student"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeeParticular" ADD CONSTRAINT "StudentFeeParticular_studentFeeStructureId_fkey" FOREIGN KEY ("studentFeeStructureId") REFERENCES "public"."StudentFeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentFeeParticular" ADD CONSTRAINT "StudentFeeParticular_globalParticularId_fkey" FOREIGN KEY ("globalParticularId") REFERENCES "public"."FeeParticular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "public"."FeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_studentFeeStructureId_fkey" FOREIGN KEY ("studentFeeStructureId") REFERENCES "public"."StudentFeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transport" ADD CONSTRAINT "Transport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transport" ADD CONSTRAINT "Transport_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LibraryBook" ADD CONSTRAINT "LibraryBook_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gallery" ADD CONSTRAINT "Gallery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubjectToTeachingStaff" ADD CONSTRAINT "_SubjectToTeachingStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubjectToTeachingStaff" ADD CONSTRAINT "_SubjectToTeachingStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."TeachingStaff"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
