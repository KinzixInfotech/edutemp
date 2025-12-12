-- CreateEnum
CREATE TYPE "PartnerRole" AS ENUM ('AFFILIATE', 'RESELLER', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PartnerLevel" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DEMO_SCHEDULED', 'CONVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('ONBOARDING', 'RENEWAL', 'UPGRADE', 'BONUS');

-- CreateEnum
CREATE TYPE "FormCategory" AS ENUM ('ADMISSION', 'SURVEY', 'FEEDBACK', 'GENERAL');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NoticeCategory" AS ENUM ('GENERAL', 'ACADEMIC', 'EXAM', 'EMERGENCY', 'EVENT', 'SPORTS', 'HOLIDAY', 'FEE', 'TRANSPORT', 'LIBRARY', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'STAFF', 'TEACHING_STAFF', 'NON_TEACHING_STAFF', 'ADMINS', 'CLASS', 'SECTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ParentRelationType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'GRANDFATHER', 'GRANDMOTHER', 'UNCLE', 'AUNT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LATE', 'EVALUATED', 'MISSING');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'COMPLETED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('WORKING_DAY', 'WEEKEND', 'HOLIDAY', 'EXAM_DAY', 'VACATION');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY', 'EMERGENCY', 'UNPAID', 'COMPENSATORY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DAILY_REMINDER', 'ABSENT_ALERT', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LOW_ATTENDANCE', 'APPROVAL_REQUIRED', 'GENERAL', 'SYLLABUS', 'ASSIGNMENT', 'FEE', 'EXAM', 'ATTENDANCE', 'NOTICE', 'LEAVE', 'TRANSPORT', 'LIBRARY', 'ADMISSION', 'EVENT', 'RESULT', 'TIMETABLE', 'BIRTHDAY', 'ANNIVERSARY');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COLLECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ERROR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEFT', 'DISABLED', 'BANNED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NOTE', 'ASSIGNMENT', 'CERTIFICATE', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CUSTOM', 'HOLIDAY', 'VACATION', 'EXAM', 'SPORTS', 'MEETING', 'ADMISSION', 'FEE_DUE', 'BIRTHDAY');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('ACADEMIC', 'ADMINISTRATIVE', 'SPORTS', 'CULTURAL', 'HOLIDAY', 'EXAM', 'MEETING', 'CELEBRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "FeeCategory" AS ENUM ('TUITION', 'ADMISSION', 'EXAMINATION', 'LIBRARY', 'LABORATORY', 'SPORTS', 'TRANSPORT', 'HOSTEL', 'MISCELLANEOUS', 'DEVELOPMENT', 'CAUTION_MONEY');

-- CreateEnum
CREATE TYPE "FeeMode" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED', 'SCHOLARSHIP', 'SIBLING', 'STAFF_WARD', 'MERIT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'CARD', 'UPI', 'NET_BANKING', 'WALLET', 'DEMAND_DRAFT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('DUE_SOON', 'OVERDUE', 'PAYMENT_CONFIRMATION', 'INSTALLMENT_DUE');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('TEACHING', 'NON_TEACHING');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'CONTRACT', 'PROBATION', 'TEMPORARY', 'PART_TIME');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('OLD', 'NEW');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayrollPaymentMethod" AS ENUM ('BANK_TRANSFER', 'NEFT', 'RTGS', 'UPI', 'CASH', 'CHEQUE');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('GENERATED', 'SENT', 'DOWNLOADED');

-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('PF_ARREARS', 'FINE', 'ADJUSTMENT', 'SALARY_ADVANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeductionFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('SALARY_ADVANCE', 'PERSONAL_LOAN', 'EMERGENCY_LOAN', 'FESTIVAL_ADVANCE');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('PENDING', 'DEDUCTED', 'SKIPPED', 'PAID_EXTERNALLY');

-- CreateEnum
CREATE TYPE "PayrollAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PROCESS', 'APPROVE', 'REJECT', 'PAY', 'GENERATE_PAYSLIP', 'SEND_PAYSLIP');

-- CreateEnum
CREATE TYPE "PayrollEntityType" AS ENUM ('PAYROLL_CONFIG', 'SALARY_STRUCTURE', 'EMPLOYEE_PROFILE', 'PAYROLL_PERIOD', 'PAYROLL_ITEM', 'PAYSLIP', 'LOAN', 'DEDUCTION', 'LEAVE_BUCKET');

-- CreateTable
CREATE TABLE "School" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "profilePicture" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "websiteConfig" JSONB,
    "signatureUrl" TEXT,
    "stampUrl" TEXT,
    "SubscriptionType" TEXT NOT NULL,
    "Language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolPublicProfile" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "tagline" TEXT,
    "description" TEXT,
    "vision" TEXT,
    "mission" TEXT,
    "coverImage" TEXT,
    "logoImage" TEXT,
    "videoUrl" TEXT,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "website" TEXT,
    "minFee" INTEGER,
    "maxFee" INTEGER,
    "feeStructureUrl" TEXT,
    "detailedFeeStructure" JSONB,
    "establishedYear" INTEGER,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalTeachers" INTEGER NOT NULL DEFAULT 0,
    "studentTeacherRatio" DOUBLE PRECISION,
    "overallRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "academicRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "infrastructureRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sportsRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "lastProfileUpdate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolAchievement" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "rank" INTEGER,
    "level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolFacility" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,

    CONSTRAINT "SchoolFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBadge" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "badgeType" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SchoolBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolGallery" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolGallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolRating" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "userId" UUID,
    "parentId" UUID,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "parentName" TEXT,
    "academicRating" DOUBLE PRECISION NOT NULL,
    "infrastructureRating" DOUBLE PRECISION NOT NULL,
    "teacherRating" DOUBLE PRECISION NOT NULL,
    "sportsRating" DOUBLE PRECISION NOT NULL,
    "overallRating" DOUBLE PRECISION NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionInquiry" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentAge" INTEGER,
    "preferredGrade" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "message" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "assignedTo" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "PartnerRole" NOT NULL DEFAULT 'AFFILIATE',
    "level" "PartnerLevel" NOT NULL DEFAULT 'SILVER',
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "companyName" TEXT,
    "businessType" TEXT,
    "gstin" TEXT,
    "panNumber" TEXT,
    "contactPerson" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "postalCode" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "renewalRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "referralCode" TEXT NOT NULL,
    "referralLink" TEXT NOT NULL,
    "qrCodeUrl" TEXT,
    "accountManagerId" UUID,
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "kycDocuments" JSONB,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "accountHolder" TEXT,
    "upiId" TEXT,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "convertedLeads" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerLead" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "schoolName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "estimatedStudents" INTEGER,
    "currentSystem" TEXT,
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" UUID,
    "assignedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "convertedSchoolId" UUID,
    "rejectedReason" TEXT,
    "lastFollowUp" TIMESTAMP(3),
    "nextFollowUp" TIMESTAMP(3),
    "demoScheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "performedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSchool" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "onboardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionPlan" TEXT NOT NULL,
    "planStartDate" TIMESTAMP(3) NOT NULL,
    "planEndDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "subscriptionAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "renewalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSchool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCommission" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "type" "CommissionType" NOT NULL DEFAULT 'ONBOARDING',
    "schoolId" UUID,
    "schoolName" TEXT NOT NULL,
    "revenueAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "payoutId" UUID,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "commissionIds" TEXT[],
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "referenceNumber" TEXT,
    "utrNumber" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "processedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAsset" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "thumbnailUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "partnerLevels" TEXT[],
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerActivity" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionSlab" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" "PartnerLevel" NOT NULL,
    "minRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxRevenue" DOUBLE PRECISION,
    "onboardingRate" DOUBLE PRECISION NOT NULL,
    "renewalRate" DOUBLE PRECISION NOT NULL,
    "upgradeRate" DOUBLE PRECISION NOT NULL,
    "minSchools" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "category" "FormCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "order" INTEGER NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentStageId" UUID,
    "createdById" UUID,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "order" INTEGER NOT NULL,
    "requiresTest" BOOLEAN NOT NULL DEFAULT false,
    "requiresInterview" BOOLEAN NOT NULL DEFAULT false,
    "feeRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageHistory" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "movedById" UUID,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "testPassed" BOOLEAN,
    "testScore" DOUBLE PRECISION,
    "testDate" TIMESTAMP(3),
    "interviewDate" TIMESTAMP(3),
    "testStartTime" TIMESTAMP(3),
    "testEndTime" TIMESTAMP(3),
    "testVenue" TEXT,
    "interviewNotes" TEXT,

    CONSTRAINT "StageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "applicationId" UUID,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "maintenanceDue" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "stops" JSONB NOT NULL,
    "assignedVehicleId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRouteAssignment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentRouteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLocation" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "categoryId" UUID,
    "schoolId" UUID NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "minimumQuantity" INTEGER NOT NULL,
    "maximumQuantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION DEFAULT 0,
    "isSellable" BOOLEAN NOT NULL DEFAULT false,
    "vendorName" TEXT NOT NULL,
    "vendorContact" TEXT NOT NULL,
    "warrantyPeriod" TEXT,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "barcode" TEXT,
    "notes" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySale" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerId" UUID,
    "buyerType" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySaleItem" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InventorySaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "academicYearId" UUID,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" UUID NOT NULL,
    "classId" INTEGER,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "issuedToId" TEXT,
    "issuedToName" TEXT,
    "handledById" TEXT NOT NULL,
    "handledByName" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDelivery" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorContact" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedByName" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subtitle" TEXT,
    "fileUrl" TEXT,
    "attachments" JSONB,
    "category" "NoticeCategory" NOT NULL,
    "audience" "Audience" NOT NULL DEFAULT 'ALL',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "issuedBy" TEXT,
    "issuerRole" TEXT,
    "publishedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importantDates" JSONB,
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeTarget" (
    "id" UUID NOT NULL,
    "noticeId" UUID NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "roleId" INTEGER,
    "userId" UUID,

    CONSTRAINT "NoticeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeRead" (
    "id" UUID NOT NULL,
    "noticeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "schoolId" UUID,
    "roleId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'Unknown',
    "profilePicture" TEXT NOT NULL DEFAULT 'default.png',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "fcmToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailAccount" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MasterAdmin" (
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "MasterAdmin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Student" (
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
    "isAlumni" BOOLEAN NOT NULL DEFAULT false,
    "alumniConvertedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "alternateNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "occupation" TEXT,
    "qualification" TEXT,
    "annualIncome" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactNumber" TEXT,
    "emergencyContactRelation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentParentLink" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "relation" "ParentRelationType" NOT NULL DEFAULT 'GUARDIAN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "canPickup" BOOLEAN NOT NULL DEFAULT true,
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "canViewFees" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentParentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeries" (
    "id" SERIAL NOT NULL,
    "examId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ExamSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamIssue" (
    "id" SERIAL NOT NULL,
    "studentId" UUID NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" UUID NOT NULL,
    "homeworkId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileName" TEXT,
    "remarks" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "grade" TEXT,
    "feedback" TEXT,
    "evaluatedBy" UUID,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingStaff" (
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
    "academicYearId" UUID NOT NULL,

    CONSTRAINT "TeachingStaff_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "NonTeachingStaff" (
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
    "academicYearId" UUID NOT NULL,

    CONSTRAINT "NonTeachingStaff_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "schoolId" UUID NOT NULL,
    "className" TEXT NOT NULL,
    "capacity" INTEGER,
    "teachingStaffUserId" UUID,
    "academicYearId" UUID,
    "examId" UUID,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "schoolId" UUID NOT NULL,
    "teachingStaffUserId" UUID,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionSubjectTeacher" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teachingStaffUserId" UUID NOT NULL,

    CONSTRAINT "SectionSubjectTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "sectionId" INTEGER,
    "subjectId" INTEGER NOT NULL,
    "teacherId" UUID NOT NULL,
    "timeSlotId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "roomNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherShift" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" UUID NOT NULL,
    "timeSlotId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "roomNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableTemplate" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "academicYearId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetable" (
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
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" SERIAL NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectCode" TEXT,
    "classId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "sectionId" INTEGER,
    "subjectId" INTEGER,
    "teacherId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ExamType" NOT NULL DEFAULT 'OFFLINE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "academicYearId" UUID,
    "isFinalExam" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "securitySettings" JSONB,
    "duration" INTEGER,
    "enableTimer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubject" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "duration" INTEGER,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "passingMarks" DOUBLE PRECISION NOT NULL DEFAULT 33,

    CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" SERIAL NOT NULL,
    "examId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "marksObtained" DOUBLE PRECISION,
    "grade" TEXT,
    "remarks" TEXT,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamHall" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "roomNumber" TEXT,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamHall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatAllocation" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "examHallId" UUID NOT NULL,
    "seatNumber" TEXT NOT NULL,

    CONSTRAINT "SeatAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
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
CREATE TABLE "FeeStructure" (
    "id" UUID NOT NULL,
    "schoolId" UUID,
    "academicYearId" UUID NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentUserId" UUID,
    "classId" INTEGER,
    "mode" "FeeMode" NOT NULL DEFAULT 'MONTHLY',
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeParticular" (
    "id" UUID NOT NULL,
    "feeStructureId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FeeParticular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeStructure" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" UUID,
    "studentUserId" UUID,
    "feeStructureId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',

    CONSTRAINT "StudentFeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentParticular" (
    "id" UUID NOT NULL,
    "installmentId" UUID NOT NULL,
    "particularId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "InstallmentParticular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "delegationId" UUID,
    "status" "AttendanceStatus" NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "workingHours" DOUBLE PRECISION DEFAULT 0,
    "checkInLocation" JSONB,
    "checkOutLocation" JSONB,
    "deviceInfo" JSONB,
    "markedBy" UUID,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLateCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "lateByMinutes" INTEGER,
    "remarks" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "approvalRemarks" TEXT,
    "leaveRequestId" UUID,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceDelegation" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "originalTeacherId" UUID NOT NULL,
    "substituteTeacherId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "sectionId" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "DelegationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolCalendar" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "dayType" "DayType" NOT NULL DEFAULT 'WORKING_DAY',
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "holidayName" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceConfig" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "defaultStartTime" TEXT NOT NULL DEFAULT '09:00',
    "defaultEndTime" TEXT NOT NULL DEFAULT '17:00',
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
    "halfDayHours" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "fullDayHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "enableGeoFencing" BOOLEAN NOT NULL DEFAULT false,
    "schoolLatitude" DOUBLE PRECISION,
    "schoolLongitude" DOUBLE PRECISION,
    "allowedRadiusMeters" INTEGER DEFAULT 500,
    "autoMarkAbsent" BOOLEAN NOT NULL DEFAULT true,
    "autoMarkTime" TEXT NOT NULL DEFAULT '10:00',
    "requireApprovalDays" INTEGER NOT NULL DEFAULT 3,
    "autoApproveLeaves" BOOLEAN NOT NULL DEFAULT false,
    "sendDailyReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderTime" TEXT NOT NULL DEFAULT '08:30',
    "notifyParents" BOOLEAN NOT NULL DEFAULT true,
    "calculateOnWeekends" BOOLEAN NOT NULL DEFAULT false,
    "minAttendancePercent" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "emergencyContact" TEXT,
    "emergencyContactPhone" TEXT,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "casualLeaveTotal" INTEGER NOT NULL DEFAULT 12,
    "casualLeaveUsed" INTEGER NOT NULL DEFAULT 0,
    "casualLeaveBalance" INTEGER NOT NULL DEFAULT 12,
    "sickLeaveTotal" INTEGER NOT NULL DEFAULT 10,
    "sickLeaveUsed" INTEGER NOT NULL DEFAULT 0,
    "sickLeaveBalance" INTEGER NOT NULL DEFAULT 10,
    "earnedLeaveTotal" INTEGER NOT NULL DEFAULT 15,
    "earnedLeaveUsed" INTEGER NOT NULL DEFAULT 0,
    "earnedLeaveBalance" INTEGER NOT NULL DEFAULT 15,
    "maternityLeaveTotal" INTEGER NOT NULL DEFAULT 180,
    "maternityLeaveUsed" INTEGER NOT NULL DEFAULT 0,
    "maternityLeaveBalance" INTEGER NOT NULL DEFAULT 180,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceStats" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalWorkingDays" INTEGER NOT NULL DEFAULT 0,
    "totalPresent" INTEGER NOT NULL DEFAULT 0,
    "totalAbsent" INTEGER NOT NULL DEFAULT 0,
    "totalHalfDay" INTEGER NOT NULL DEFAULT 0,
    "totalLate" INTEGER NOT NULL DEFAULT 0,
    "totalLeaves" INTEGER NOT NULL DEFAULT 0,
    "totalHolidays" INTEGER NOT NULL DEFAULT 0,
    "attendancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkAttendance" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "date" DATE NOT NULL,
    "markedBy" UUID NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalStudents" INTEGER NOT NULL,
    "presentCount" INTEGER NOT NULL,
    "absentCount" INTEGER NOT NULL,
    "lateCount" INTEGER NOT NULL,
    "halfDayCount" INTEGER NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "BulkAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceDocument" (
    "id" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveDocument" (
    "id" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceNotification" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "senderId" UUID,
    "receiverId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "icon" TEXT NOT NULL DEFAULT '📢',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBook" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "ISBN" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "edition" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBookCopy" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "barcode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBookCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryTransaction" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "copyId" UUID NOT NULL,
    "userType" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finePaid" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,

    CONSTRAINT "LibraryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibrarySettings" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "maxBooksStudent" INTEGER NOT NULL DEFAULT 3,
    "maxBooksTeacher" INTEGER NOT NULL DEFAULT 5,
    "issueDaysStudent" INTEGER NOT NULL DEFAULT 14,
    "issueDaysTeacher" INTEGER NOT NULL DEFAULT 30,
    "finePerDay" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibrarySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBookRequest" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userType" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" UUID,
    "approvedDate" TIMESTAMP(3),
    "pickupCode" TEXT,
    "pickupDate" TIMESTAMP(3),
    "copyId" UUID,
    "collectedDate" TIMESTAMP(3),
    "collectedBy" UUID,
    "rejectedBy" UUID,
    "rejectedDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "remarks" TEXT,

    CONSTRAINT "LibraryBookRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" UUID,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" SERIAL NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "imageUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stamp" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "position" JSONB,
    "forDocument" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSignature" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "signatureId" UUID NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "templateType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateStamp" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "stampId" UUID NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "templateType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateStamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrVerificationSettings" (
    "id" TEXT NOT NULL,
    "schoolId" UUID NOT NULL,
    "enabledForCertificates" BOOLEAN NOT NULL DEFAULT true,
    "enabledForIdCards" BOOLEAN NOT NULL DEFAULT true,
    "enabledForAdmitCards" BOOLEAN NOT NULL DEFAULT false,
    "encodeStudentId" BOOLEAN NOT NULL DEFAULT true,
    "encodeCertificateId" BOOLEAN NOT NULL DEFAULT true,
    "encodeIssueDate" BOOLEAN NOT NULL DEFAULT true,
    "encodeSchoolId" BOOLEAN NOT NULL DEFAULT true,
    "encodeVerificationUrl" BOOLEAN NOT NULL DEFAULT true,
    "customFields" JSONB,
    "qrPlacementX" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "qrPlacementY" DOUBLE PRECISION NOT NULL DEFAULT 720,
    "qrSize" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "qrColor" TEXT NOT NULL DEFAULT '#000000',
    "qrBackground" TEXT NOT NULL DEFAULT '#FFFFFF',
    "errorCorrectionLevel" TEXT NOT NULL DEFAULT 'M',
    "logoOverlayUrl" TEXT,
    "verificationBaseUrl" TEXT NOT NULL DEFAULT 'https://your-school.com/verify',
    "portalTitle" TEXT NOT NULL DEFAULT 'Verify Certificate',
    "portalLogoUrl" TEXT,
    "portalPrimaryColor" TEXT NOT NULL DEFAULT '#1e40af',
    "useHashEncryption" BOOLEAN NOT NULL DEFAULT true,
    "hashAlgorithm" TEXT NOT NULL DEFAULT 'SHA256',
    "qrValidityDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrVerificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfExportSettings" (
    "id" TEXT NOT NULL,
    "schoolId" UUID NOT NULL,
    "paperSize" TEXT NOT NULL DEFAULT 'A4',
    "customWidth" DOUBLE PRECISION,
    "customHeight" DOUBLE PRECISION,
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "marginTop" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "marginBottom" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "marginLeft" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "marginRight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "resolution" TEXT NOT NULL DEFAULT 'standard',
    "compression" TEXT NOT NULL DEFAULT 'medium',
    "embedFonts" BOOLEAN NOT NULL DEFAULT true,
    "headerImageUrl" TEXT,
    "footerImageUrl" TEXT,
    "schoolLogoUrl" TEXT,
    "watermarkType" TEXT NOT NULL DEFAULT 'none',
    "watermarkText" TEXT,
    "watermarkImageUrl" TEXT,
    "footerText" TEXT,
    "pageNumbering" BOOLEAN NOT NULL DEFAULT true,
    "passwordProtect" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "disablePrint" BOOLEAN NOT NULL DEFAULT false,
    "disableCopy" BOOLEAN NOT NULL DEFAULT false,
    "digitalSignature" BOOLEAN NOT NULL DEFAULT false,
    "saveAsDefault" BOOLEAN NOT NULL DEFAULT false,
    "fileNameFormat" TEXT NOT NULL DEFAULT '{student_name}_{document_type}.pdf',
    "autoSaveLocation" TEXT NOT NULL DEFAULT 'cloud',
    "bulkExportBehavior" TEXT NOT NULL DEFAULT 'separate',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfExportSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "schoolId" UUID NOT NULL,
    "layoutConfig" JSONB NOT NULL,
    "createdById" UUID,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateType" TEXT NOT NULL,
    "subType" TEXT NOT NULL,
    "schoolId" UUID NOT NULL,
    "layoutConfig" JSONB NOT NULL,
    "createdById" UUID,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "certificateTemplateId" UUID,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateGenerated" (
    "id" UUID NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "templateId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "issuedById" UUID,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customFields" JSONB NOT NULL,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "showToParent" BOOLEAN NOT NULL DEFAULT false,
    "sharedAt" TIMESTAMP(3),

    CONSTRAINT "CertificateGenerated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalIdCard" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID,
    "qrCodeUrl" TEXT,
    "layoutConfig" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "validUntil" TIMESTAMP(3),
    "templateId" TEXT,
    "showToParent" BOOLEAN NOT NULL DEFAULT false,
    "sharedAt" TIMESTAMP(3),

    CONSTRAINT "DigitalIdCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmitCard" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "center" TEXT,
    "layoutConfig" JSONB NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "showToParent" BOOLEAN NOT NULL DEFAULT false,
    "sharedAt" TIMESTAMP(3),

    CONSTRAINT "AdmitCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "tableName" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldData" JSONB,
    "newData" JSONB,
    "error" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalFeeStructure" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" "FeeMode" NOT NULL DEFAULT 'YEARLY',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalFeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalFeeParticular" (
    "id" UUID NOT NULL,
    "globalFeeStructureId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "category" "FeeCategory" NOT NULL DEFAULT 'TUITION',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GlobalFeeParticular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInstallmentRule" (
    "id" UUID NOT NULL,
    "globalFeeStructureId" UUID NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "lateFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFeeAfterDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeeInstallmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFee" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "globalFeeStructureId" UUID,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "status" "FeeStatus" NOT NULL DEFAULT 'UNPAID',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPaymentDate" TIMESTAMP(3),

    CONSTRAINT "StudentFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeParticular" (
    "id" UUID NOT NULL,
    "studentFeeId" UUID NOT NULL,
    "globalParticularId" UUID,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FeeStatus" NOT NULL DEFAULT 'UNPAID',
    "feeParticularId" UUID,
    "studentFeeStructureId" UUID,

    CONSTRAINT "StudentFeeParticular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeInstallment" (
    "id" UUID NOT NULL,
    "studentFeeId" UUID NOT NULL,
    "installmentRuleId" UUID,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "lateFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),

    CONSTRAINT "StudentFeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeDiscount" (
    "id" UUID NOT NULL,
    "studentFeeId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'FIXED',
    "value" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "approvedBy" UUID,
    "approvedDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" UUID NOT NULL,
    "studentFeeId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "transactionId" TEXT,
    "referenceNumber" TEXT,
    "gatewayName" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewayResponse" JSONB,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedDate" TIMESTAMP(3),
    "receiptNumber" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "collectedBy" UUID,
    "remarks" TEXT,
    "feeStructureId" UUID,
    "studentFeeStructureId" UUID,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePaymentInstallment" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "installmentId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FeePaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeReminder" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "studentFeeId" UUID NOT NULL,
    "reminderType" "ReminderType" NOT NULL DEFAULT 'DUE_SOON',
    "message" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',

    CONSTRAINT "FeeReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "EventType" NOT NULL DEFAULT 'CUSTOM',
    "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "venue" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "targetAudience" "Audience" NOT NULL DEFAULT 'ALL',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" JSONB,
    "createdById" UUID,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventTarget" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "roleId" INTEGER,
    "userId" UUID,

    CONSTRAINT "CalendarEventTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReminder" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "reminderType" "ReminderType",
    "reminderTime" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineExamQuestion" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB,
    "marks" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "OnlineExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentExamAttempt" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "securityViolations" JSONB,

    CONSTRAINT "StudentExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentExamAnswer" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "marksObtained" DOUBLE PRECISION,

    CONSTRAINT "StudentExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamHallInvigilator" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "hallId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamHallInvigilator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallAttendance" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "hallId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" UUID NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionHistory" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "fromClassId" INTEGER NOT NULL,
    "toClassId" INTEGER NOT NULL,
    "fromYearId" UUID NOT NULL,
    "toYearId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedBy" UUID NOT NULL,

    CONSTRAINT "PromotionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaLibrary" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedById" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" JSONB,
    "altText" TEXT,

    CONSTRAINT "MediaLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alumni" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "originalStudentId" UUID NOT NULL,
    "admissionNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "lastClassId" INTEGER NOT NULL,
    "lastSectionId" INTEGER NOT NULL,
    "lastAcademicYear" UUID,
    "graduationYear" INTEGER NOT NULL,
    "leavingDate" DATE NOT NULL,
    "leavingReason" TEXT NOT NULL,
    "currentAddress" TEXT,
    "currentCity" TEXT,
    "currentState" TEXT,
    "currentCountry" TEXT,
    "currentEmail" TEXT,
    "currentPhone" TEXT,
    "currentOccupation" TEXT,
    "currentCompany" TEXT,
    "higherEducation" TEXT,
    "achievements" TEXT,
    "willingToMentor" BOOLEAN NOT NULL DEFAULT false,
    "canContact" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alumni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollConfig" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "payCycleDay" INTEGER NOT NULL DEFAULT 1,
    "paymentDay" INTEGER NOT NULL DEFAULT 7,
    "standardWorkingDays" INTEGER NOT NULL DEFAULT 26,
    "standardWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "enablePF" BOOLEAN NOT NULL DEFAULT true,
    "pfEmployerPercent" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "pfEmployeePercent" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "pfWageLimit" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "enableESI" BOOLEAN NOT NULL DEFAULT true,
    "esiEmployerPercent" DOUBLE PRECISION NOT NULL DEFAULT 3.25,
    "esiEmployeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "esiWageLimit" DOUBLE PRECISION NOT NULL DEFAULT 21000,
    "enableProfessionalTax" BOOLEAN NOT NULL DEFAULT true,
    "professionalTaxSlab" JSONB,
    "enableTDS" BOOLEAN NOT NULL DEFAULT true,
    "tdsSlabs" JSONB,
    "enableLeaveEncashment" BOOLEAN NOT NULL DEFAULT false,
    "leaveEncashmentRate" DOUBLE PRECISION,
    "enableOvertime" BOOLEAN NOT NULL DEFAULT false,
    "overtimeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 15,
    "halfDayThreshold" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayrollProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "employeeType" "EmployeeType" NOT NULL DEFAULT 'TEACHING',
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'PERMANENT',
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "confirmationDate" TIMESTAMP(3),
    "exitDate" TIMESTAMP(3),
    "salaryStructureId" UUID,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "accountHolder" TEXT,
    "upiId" TEXT,
    "panNumber" TEXT,
    "aadharNumber" TEXT,
    "uanNumber" TEXT,
    "esiNumber" TEXT,
    "taxRegime" "TaxRegime" NOT NULL DEFAULT 'NEW',
    "taxDeclarations" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayrollProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hraPercent" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "daPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medicalAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" JSONB,
    "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalWorkingDays" INTEGER NOT NULL,
    "holidays" INTEGER NOT NULL DEFAULT 0,
    "weekends" INTEGER NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "processedAt" TIMESTAMP(3),
    "processedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" UUID,
    "paidAt" TIMESTAMP(3),
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalGrossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNetSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "daysWorked" INTEGER NOT NULL DEFAULT 0,
    "daysAbsent" INTEGER NOT NULL DEFAULT 0,
    "daysLeave" INTEGER NOT NULL DEFAULT 0,
    "daysHoliday" INTEGER NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "halfDayCount" INTEGER NOT NULL DEFAULT 0,
    "basicEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hraEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medicalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incentives" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arrears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherEarnings" JSONB,
    "grossEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esiEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esiEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loanDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lossOfPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" JSONB,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PayrollPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PayrollPaymentMethod",
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentRemarks" TEXT,
    "payslipId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeId_staff" TEXT NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "bankAccount" TEXT,
    "panNumber" TEXT,
    "uanNumber" TEXT,
    "earnings" JSONB NOT NULL,
    "deductions" JSONB NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "attendanceSummary" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "status" "PayslipStatus" NOT NULL DEFAULT 'GENERATED',
    "sentAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDeduction" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" "DeductionType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "frequency" "DeductionFrequency" NOT NULL DEFAULT 'ONE_TIME',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLoan" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" "LoanType" NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "emiAmount" DOUBLE PRECISION NOT NULL,
    "tenure" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPending" DOUBLE PRECISION NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" UUID NOT NULL,
    "loanId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "payrollItemId" UUID,
    "status" "RepaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBucket" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "yearlyLimit" INTEGER NOT NULL DEFAULT 0,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 0,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryForward" INTEGER NOT NULL DEFAULT 0,
    "encashable" BOOLEAN NOT NULL DEFAULT false,
    "encashmentRate" DOUBLE PRECISION,
    "applicableDuringProbation" BOOLEAN NOT NULL DEFAULT false,
    "probationLimit" INTEGER NOT NULL DEFAULT 0,
    "applicableTo" "EmployeeType"[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAuditLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "action" "PayrollAuditAction" NOT NULL,
    "entityType" "PayrollEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "performedBy" UUID NOT NULL,
    "performerName" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SubjectToTeachingStaff" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_SubjectToTeachingStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_domain_key" ON "School"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "School_schoolCode_key" ON "School"("schoolCode");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "School"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPublicProfile_schoolId_key" ON "SchoolPublicProfile"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolPublicProfile_isPubliclyVisible_idx" ON "SchoolPublicProfile"("isPubliclyVisible");

-- CreateIndex
CREATE INDEX "SchoolPublicProfile_isFeatured_idx" ON "SchoolPublicProfile"("isFeatured");

-- CreateIndex
CREATE INDEX "SchoolPublicProfile_overallRating_idx" ON "SchoolPublicProfile"("overallRating");

-- CreateIndex
CREATE INDEX "SchoolAchievement_profileId_idx" ON "SchoolAchievement"("profileId");

-- CreateIndex
CREATE INDEX "SchoolAchievement_category_idx" ON "SchoolAchievement"("category");

-- CreateIndex
CREATE INDEX "SchoolAchievement_year_idx" ON "SchoolAchievement"("year");

-- CreateIndex
CREATE INDEX "SchoolFacility_profileId_idx" ON "SchoolFacility"("profileId");

-- CreateIndex
CREATE INDEX "SchoolFacility_category_idx" ON "SchoolFacility"("category");

-- CreateIndex
CREATE INDEX "SchoolBadge_profileId_idx" ON "SchoolBadge"("profileId");

-- CreateIndex
CREATE INDEX "SchoolGallery_profileId_idx" ON "SchoolGallery"("profileId");

-- CreateIndex
CREATE INDEX "SchoolGallery_category_idx" ON "SchoolGallery"("category");

-- CreateIndex
CREATE INDEX "SchoolRating_profileId_idx" ON "SchoolRating"("profileId");

-- CreateIndex
CREATE INDEX "SchoolRating_userId_idx" ON "SchoolRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRating_profileId_userId_key" ON "SchoolRating"("profileId", "userId");

-- CreateIndex
CREATE INDEX "AdmissionInquiry_profileId_idx" ON "AdmissionInquiry"("profileId");

-- CreateIndex
CREATE INDEX "AdmissionInquiry_status_idx" ON "AdmissionInquiry"("status");

-- CreateIndex
CREATE INDEX "AdmissionInquiry_createdAt_idx" ON "AdmissionInquiry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_gstin_key" ON "Partner"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_panNumber_key" ON "Partner"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_contactEmail_key" ON "Partner"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_referralCode_key" ON "Partner"("referralCode");

-- CreateIndex
CREATE INDEX "Partner_userId_idx" ON "Partner"("userId");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE INDEX "Partner_level_idx" ON "Partner"("level");

-- CreateIndex
CREATE INDEX "Partner_referralCode_idx" ON "Partner"("referralCode");

-- CreateIndex
CREATE INDEX "Partner_contactEmail_idx" ON "Partner"("contactEmail");

-- CreateIndex
CREATE INDEX "PartnerLead_partnerId_idx" ON "PartnerLead"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerLead_status_idx" ON "PartnerLead"("status");

-- CreateIndex
CREATE INDEX "PartnerLead_contactEmail_idx" ON "PartnerLead"("contactEmail");

-- CreateIndex
CREATE INDEX "PartnerLead_assignedToId_idx" ON "PartnerLead"("assignedToId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt");

-- CreateIndex
CREATE INDEX "PartnerSchool_partnerId_idx" ON "PartnerSchool"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerSchool_schoolId_idx" ON "PartnerSchool"("schoolId");

-- CreateIndex
CREATE INDEX "PartnerSchool_renewalDate_idx" ON "PartnerSchool"("renewalDate");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSchool_partnerId_schoolId_key" ON "PartnerSchool"("partnerId", "schoolId");

-- CreateIndex
CREATE INDEX "PartnerCommission_partnerId_idx" ON "PartnerCommission"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerCommission_isPaid_idx" ON "PartnerCommission"("isPaid");

-- CreateIndex
CREATE INDEX "PartnerCommission_periodMonth_periodYear_idx" ON "PartnerCommission"("periodMonth", "periodYear");

-- CreateIndex
CREATE INDEX "PartnerPayout_partnerId_idx" ON "PartnerPayout"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerPayout_status_idx" ON "PartnerPayout"("status");

-- CreateIndex
CREATE INDEX "PartnerPayout_requestedAt_idx" ON "PartnerPayout"("requestedAt");

-- CreateIndex
CREATE INDEX "MarketingAsset_type_idx" ON "MarketingAsset"("type");

-- CreateIndex
CREATE INDEX "MarketingAsset_isActive_idx" ON "MarketingAsset"("isActive");

-- CreateIndex
CREATE INDEX "PartnerActivity_partnerId_idx" ON "PartnerActivity"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerActivity_createdAt_idx" ON "PartnerActivity"("createdAt");

-- CreateIndex
CREATE INDEX "CommissionSlab_level_idx" ON "CommissionSlab"("level");

-- CreateIndex
CREATE INDEX "CommissionSlab_isActive_idx" ON "CommissionSlab"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "Form"("slug");

-- CreateIndex
CREATE INDEX "Form_schoolId_idx" ON "Form"("schoolId");

-- CreateIndex
CREATE INDEX "Form_slug_idx" ON "Form"("slug");

-- CreateIndex
CREATE INDEX "Form_category_idx" ON "Form"("category");

-- CreateIndex
CREATE INDEX "FormField_formId_idx" ON "FormField"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_schoolId_formId_applicantEmail_key" ON "Application"("schoolId", "formId", "applicantEmail");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "Stage_schoolId_idx" ON "Stage"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_schoolId_name_key" ON "Stage"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_schoolId_order_key" ON "Stage"("schoolId", "order");

-- CreateIndex
CREATE INDEX "StageHistory_applicationId_idx" ON "StageHistory"("applicationId");

-- CreateIndex
CREATE INDEX "StageHistory_movedAt_idx" ON "StageHistory"("movedAt");

-- CreateIndex
CREATE INDEX "Payment_applicationId_idx" ON "Payment"("applicationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "Vehicle_schoolId_idx" ON "Vehicle"("schoolId");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "Route_schoolId_idx" ON "Route"("schoolId");

-- CreateIndex
CREATE INDEX "Route_name_idx" ON "Route"("name");

-- CreateIndex
CREATE INDEX "StudentRouteAssignment_studentId_idx" ON "StudentRouteAssignment"("studentId");

-- CreateIndex
CREATE INDEX "StudentRouteAssignment_routeId_idx" ON "StudentRouteAssignment"("routeId");

-- CreateIndex
CREATE INDEX "VehicleLocation_vehicleId_idx" ON "VehicleLocation"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleLocation_timestamp_idx" ON "VehicleLocation"("timestamp");

-- CreateIndex
CREATE INDEX "Assignment_schoolId_idx" ON "Assignment"("schoolId");

-- CreateIndex
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");

-- CreateIndex
CREATE INDEX "Assignment_dueDate_idx" ON "Assignment"("dueDate");

-- CreateIndex
CREATE INDEX "InventoryCategory_schoolId_idx" ON "InventoryCategory"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_schoolId_name_key" ON "InventoryCategory"("schoolId", "name");

-- CreateIndex
CREATE INDEX "InventorySale_schoolId_idx" ON "InventorySale"("schoolId");

-- CreateIndex
CREATE INDEX "InventorySale_saleDate_idx" ON "InventorySale"("saleDate");

-- CreateIndex
CREATE INDEX "Notice_schoolId_idx" ON "Notice"("schoolId");

-- CreateIndex
CREATE INDEX "Notice_status_idx" ON "Notice"("status");

-- CreateIndex
CREATE INDEX "Notice_priority_idx" ON "Notice"("priority");

-- CreateIndex
CREATE INDEX "Notice_category_idx" ON "Notice"("category");

-- CreateIndex
CREATE INDEX "Notice_publishedAt_idx" ON "Notice"("publishedAt");

-- CreateIndex
CREATE INDEX "Notice_expiryDate_idx" ON "Notice"("expiryDate");

-- CreateIndex
CREATE INDEX "NoticeTarget_noticeId_idx" ON "NoticeTarget"("noticeId");

-- CreateIndex
CREATE INDEX "NoticeTarget_classId_idx" ON "NoticeTarget"("classId");

-- CreateIndex
CREATE INDEX "NoticeTarget_sectionId_idx" ON "NoticeTarget"("sectionId");

-- CreateIndex
CREATE INDEX "NoticeTarget_roleId_idx" ON "NoticeTarget"("roleId");

-- CreateIndex
CREATE INDEX "NoticeTarget_userId_idx" ON "NoticeTarget"("userId");

-- CreateIndex
CREATE INDEX "NoticeRead_noticeId_idx" ON "NoticeRead"("noticeId");

-- CreateIndex
CREATE INDEX "NoticeRead_userId_idx" ON "NoticeRead"("userId");

-- CreateIndex
CREATE INDEX "NoticeRead_readAt_idx" ON "NoticeRead"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeRead_noticeId_userId_key" ON "NoticeRead"("noticeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailAccount_userId_email_key" ON "GmailAccount"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAdmin_userId_key" ON "MasterAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAdmin_schoolId_key" ON "MasterAdmin"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNo_key" ON "Student"("admissionNo");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE INDEX "Student_sectionId_idx" ON "Student"("sectionId");

-- CreateIndex
CREATE INDEX "Student_parentId_idx" ON "Student"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_contactNumber_key" ON "Parent"("contactNumber");

-- CreateIndex
CREATE INDEX "Parent_schoolId_idx" ON "Parent"("schoolId");

-- CreateIndex
CREATE INDEX "Parent_contactNumber_idx" ON "Parent"("contactNumber");

-- CreateIndex
CREATE INDEX "Parent_email_idx" ON "Parent"("email");

-- CreateIndex
CREATE INDEX "Parent_userId_idx" ON "Parent"("userId");

-- CreateIndex
CREATE INDEX "StudentParentLink_studentId_idx" ON "StudentParentLink"("studentId");

-- CreateIndex
CREATE INDEX "StudentParentLink_parentId_idx" ON "StudentParentLink"("parentId");

-- CreateIndex
CREATE INDEX "StudentParentLink_relation_idx" ON "StudentParentLink"("relation");

-- CreateIndex
CREATE UNIQUE INDEX "StudentParentLink_studentId_parentId_key" ON "StudentParentLink"("studentId", "parentId");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_homeworkId_idx" ON "HomeworkSubmission"("homeworkId");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_studentId_idx" ON "HomeworkSubmission"("studentId");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_status_idx" ON "HomeworkSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_homeworkId_studentId_key" ON "HomeworkSubmission"("homeworkId", "studentId");

-- CreateIndex
CREATE INDEX "TeachingStaff_departmentId_idx" ON "TeachingStaff"("departmentId");

-- CreateIndex
CREATE INDEX "NonTeachingStaff_departmentId_idx" ON "NonTeachingStaff"("departmentId");

-- CreateIndex
CREATE INDEX "Class_schoolId_idx" ON "Class"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_id_schoolId_key" ON "Class"("id", "schoolId");

-- CreateIndex
CREATE INDEX "Section_classId_idx" ON "Section"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_name_key" ON "Section"("classId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SectionSubjectTeacher_sectionId_subjectId_key" ON "SectionSubjectTeacher"("sectionId", "subjectId");

-- CreateIndex
CREATE INDEX "TimeSlot_schoolId_idx" ON "TimeSlot"("schoolId");

-- CreateIndex
CREATE INDEX "TimeSlot_schoolId_sequence_idx" ON "TimeSlot"("schoolId", "sequence");

-- CreateIndex
CREATE INDEX "TimetableEntry_schoolId_idx" ON "TimetableEntry"("schoolId");

-- CreateIndex
CREATE INDEX "TimetableEntry_teacherId_dayOfWeek_idx" ON "TimetableEntry"("teacherId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TimetableEntry_classId_sectionId_dayOfWeek_idx" ON "TimetableEntry"("classId", "sectionId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TimetableEntry_timeSlotId_dayOfWeek_idx" ON "TimetableEntry"("timeSlotId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_classId_sectionId_timeSlotId_dayOfWeek_key" ON "TimetableEntry"("classId", "sectionId", "timeSlotId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TeacherShift_schoolId_idx" ON "TeacherShift"("schoolId");

-- CreateIndex
CREATE INDEX "TeacherShift_teacherId_date_idx" ON "TeacherShift"("teacherId", "date");

-- CreateIndex
CREATE INDEX "TeacherShift_classId_sectionId_date_idx" ON "TeacherShift"("classId", "sectionId", "date");

-- CreateIndex
CREATE INDEX "TeacherShift_date_idx" ON "TeacherShift"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherShift_teacherId_date_timeSlotId_key" ON "TeacherShift"("teacherId", "date", "timeSlotId");

-- CreateIndex
CREATE INDEX "TimetableTemplate_schoolId_idx" ON "TimetableTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "TimetableTemplate_academicYearId_idx" ON "TimetableTemplate"("academicYearId");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Subject_classId_idx" ON "Subject"("classId");

-- CreateIndex
CREATE INDEX "Subject_departmentId_idx" ON "Subject"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Homework_schoolId_idx" ON "Homework"("schoolId");

-- CreateIndex
CREATE INDEX "Homework_classId_idx" ON "Homework"("classId");

-- CreateIndex
CREATE INDEX "Homework_sectionId_idx" ON "Homework"("sectionId");

-- CreateIndex
CREATE INDEX "Homework_teacherId_idx" ON "Homework"("teacherId");

-- CreateIndex
CREATE INDEX "Homework_dueDate_idx" ON "Homework"("dueDate");

-- CreateIndex
CREATE INDEX "Homework_isActive_idx" ON "Homework"("isActive");

-- CreateIndex
CREATE INDEX "Exam_schoolId_idx" ON "Exam"("schoolId");

-- CreateIndex
CREATE INDEX "ExamSubject_examId_idx" ON "ExamSubject"("examId");

-- CreateIndex
CREATE INDEX "ExamSubject_subjectId_idx" ON "ExamSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubject_examId_subjectId_key" ON "ExamSubject"("examId", "subjectId");

-- CreateIndex
CREATE INDEX "ExamResult_examId_idx" ON "ExamResult"("examId");

-- CreateIndex
CREATE INDEX "ExamResult_studentId_idx" ON "ExamResult"("studentId");

-- CreateIndex
CREATE INDEX "ExamResult_subjectId_idx" ON "ExamResult"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_examId_studentId_subjectId_key" ON "ExamResult"("examId", "studentId", "subjectId");

-- CreateIndex
CREATE INDEX "ExamHall_schoolId_idx" ON "ExamHall"("schoolId");

-- CreateIndex
CREATE INDEX "SeatAllocation_examId_idx" ON "SeatAllocation"("examId");

-- CreateIndex
CREATE INDEX "SeatAllocation_examHallId_idx" ON "SeatAllocation"("examHallId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatAllocation_examId_studentId_key" ON "SeatAllocation"("examId", "studentId");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_idx" ON "AcademicYear"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "InstallmentParticular_installmentId_idx" ON "InstallmentParticular"("installmentId");

-- CreateIndex
CREATE INDEX "InstallmentParticular_particularId_idx" ON "InstallmentParticular"("particularId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentParticular_installmentId_particularId_key" ON "InstallmentParticular"("installmentId", "particularId");

-- CreateIndex
CREATE INDEX "Attendance_userId_date_idx" ON "Attendance"("userId", "date");

-- CreateIndex
CREATE INDEX "Attendance_schoolId_date_idx" ON "Attendance"("schoolId", "date");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_approvalStatus_idx" ON "Attendance"("approvalStatus");

-- CreateIndex
CREATE INDEX "Attendance_markedBy_idx" ON "Attendance"("markedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_schoolId_date_key" ON "Attendance"("userId", "schoolId", "date");

-- CreateIndex
CREATE INDEX "AttendanceDelegation_schoolId_startDate_endDate_idx" ON "AttendanceDelegation"("schoolId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AttendanceDelegation_substituteTeacherId_startDate_endDate_idx" ON "AttendanceDelegation"("substituteTeacherId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AttendanceDelegation_originalTeacherId_startDate_endDate_idx" ON "AttendanceDelegation"("originalTeacherId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AttendanceDelegation_status_idx" ON "AttendanceDelegation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDelegation_schoolId_originalTeacherId_startDate_e_key" ON "AttendanceDelegation"("schoolId", "originalTeacherId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDelegation_schoolId_classId_sectionId_startDate_e_key" ON "AttendanceDelegation"("schoolId", "classId", "sectionId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "SchoolCalendar_schoolId_date_idx" ON "SchoolCalendar"("schoolId", "date");

-- CreateIndex
CREATE INDEX "SchoolCalendar_dayType_idx" ON "SchoolCalendar"("dayType");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCalendar_schoolId_date_key" ON "SchoolCalendar"("schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceConfig_schoolId_key" ON "AttendanceConfig"("schoolId");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_status_idx" ON "LeaveRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_schoolId_status_idx" ON "LeaveRequest"("schoolId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "LeaveBalance_userId_schoolId_idx" ON "LeaveBalance"("userId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_userId_academicYearId_key" ON "LeaveBalance"("userId", "academicYearId");

-- CreateIndex
CREATE INDEX "AttendanceStats_userId_schoolId_idx" ON "AttendanceStats"("userId", "schoolId");

-- CreateIndex
CREATE INDEX "AttendanceStats_academicYearId_month_year_idx" ON "AttendanceStats"("academicYearId", "month", "year");

-- CreateIndex
CREATE INDEX "AttendanceStats_attendancePercentage_idx" ON "AttendanceStats"("attendancePercentage");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceStats_userId_academicYearId_month_year_key" ON "AttendanceStats"("userId", "academicYearId", "month", "year");

-- CreateIndex
CREATE INDEX "BulkAttendance_schoolId_date_idx" ON "BulkAttendance"("schoolId", "date");

-- CreateIndex
CREATE INDEX "BulkAttendance_classId_date_idx" ON "BulkAttendance"("classId", "date");

-- CreateIndex
CREATE INDEX "BulkAttendance_markedBy_idx" ON "BulkAttendance"("markedBy");

-- CreateIndex
CREATE INDEX "AttendanceDocument_attendanceId_idx" ON "AttendanceDocument"("attendanceId");

-- CreateIndex
CREATE INDEX "LeaveDocument_leaveRequestId_idx" ON "LeaveDocument"("leaveRequestId");

-- CreateIndex
CREATE INDEX "AttendanceNotification_status_scheduledFor_idx" ON "AttendanceNotification"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "AttendanceNotification_userId_status_idx" ON "AttendanceNotification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_receiverId_isRead_idx" ON "Notification"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_receiverId_createdAt_idx" ON "Notification"("receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_schoolId_idx" ON "Notification"("schoolId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "LibraryBook_schoolId_idx" ON "LibraryBook"("schoolId");

-- CreateIndex
CREATE INDEX "LibraryBook_ISBN_idx" ON "LibraryBook"("ISBN");

-- CreateIndex
CREATE INDEX "LibraryBook_title_idx" ON "LibraryBook"("title");

-- CreateIndex
CREATE INDEX "LibraryBook_author_idx" ON "LibraryBook"("author");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryBookCopy_barcode_key" ON "LibraryBookCopy"("barcode");

-- CreateIndex
CREATE INDEX "LibraryBookCopy_bookId_idx" ON "LibraryBookCopy"("bookId");

-- CreateIndex
CREATE INDEX "LibraryBookCopy_status_idx" ON "LibraryBookCopy"("status");

-- CreateIndex
CREATE INDEX "LibraryBookCopy_barcode_idx" ON "LibraryBookCopy"("barcode");

-- CreateIndex
CREATE INDEX "LibraryTransaction_userId_idx" ON "LibraryTransaction"("userId");

-- CreateIndex
CREATE INDEX "LibraryTransaction_status_idx" ON "LibraryTransaction"("status");

-- CreateIndex
CREATE INDEX "LibraryTransaction_dueDate_idx" ON "LibraryTransaction"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LibrarySettings_schoolId_key" ON "LibrarySettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryBookRequest_pickupCode_key" ON "LibraryBookRequest"("pickupCode");

-- CreateIndex
CREATE INDEX "LibraryBookRequest_schoolId_idx" ON "LibraryBookRequest"("schoolId");

-- CreateIndex
CREATE INDEX "LibraryBookRequest_userId_idx" ON "LibraryBookRequest"("userId");

-- CreateIndex
CREATE INDEX "LibraryBookRequest_status_idx" ON "LibraryBookRequest"("status");

-- CreateIndex
CREATE INDEX "LibraryBookRequest_pickupDate_idx" ON "LibraryBookRequest"("pickupDate");

-- CreateIndex
CREATE INDEX "Gallery_schoolId_idx" ON "Gallery"("schoolId");

-- CreateIndex
CREATE INDEX "Signature_schoolId_idx" ON "Signature"("schoolId");

-- CreateIndex
CREATE INDEX "Stamp_schoolId_idx" ON "Stamp"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "QrVerificationSettings_schoolId_key" ON "QrVerificationSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "PdfExportSettings_schoolId_key" ON "PdfExportSettings"("schoolId");

-- CreateIndex
CREATE INDEX "CertificateTemplate_schoolId_idx" ON "CertificateTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "CertificateTemplate_type_idx" ON "CertificateTemplate"("type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_schoolId_idx" ON "DocumentTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_templateType_idx" ON "DocumentTemplate"("templateType");

-- CreateIndex
CREATE INDEX "DocumentTemplate_subType_idx" ON "DocumentTemplate"("subType");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_schoolId_templateType_subType_name_key" ON "DocumentTemplate"("schoolId", "templateType", "subType", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateGenerated_certificateNumber_key" ON "CertificateGenerated"("certificateNumber");

-- CreateIndex
CREATE INDEX "CertificateGenerated_schoolId_idx" ON "CertificateGenerated"("schoolId");

-- CreateIndex
CREATE INDEX "CertificateGenerated_studentId_idx" ON "CertificateGenerated"("studentId");

-- CreateIndex
CREATE INDEX "CertificateGenerated_templateId_idx" ON "CertificateGenerated"("templateId");

-- CreateIndex
CREATE INDEX "CertificateGenerated_status_idx" ON "CertificateGenerated"("status");

-- CreateIndex
CREATE INDEX "CertificateGenerated_showToParent_idx" ON "CertificateGenerated"("showToParent");

-- CreateIndex
CREATE INDEX "DigitalIdCard_schoolId_idx" ON "DigitalIdCard"("schoolId");

-- CreateIndex
CREATE INDEX "DigitalIdCard_studentId_idx" ON "DigitalIdCard"("studentId");

-- CreateIndex
CREATE INDEX "DigitalIdCard_status_idx" ON "DigitalIdCard"("status");

-- CreateIndex
CREATE INDEX "DigitalIdCard_showToParent_idx" ON "DigitalIdCard"("showToParent");

-- CreateIndex
CREATE INDEX "AdmitCard_schoolId_idx" ON "AdmitCard"("schoolId");

-- CreateIndex
CREATE INDEX "AdmitCard_studentId_idx" ON "AdmitCard"("studentId");

-- CreateIndex
CREATE INDEX "AdmitCard_examId_idx" ON "AdmitCard"("examId");

-- CreateIndex
CREATE INDEX "AdmitCard_showToParent_idx" ON "AdmitCard"("showToParent");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_sessionToken_idx" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_isRevoked_idx" ON "UserSession"("isRevoked");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_idx" ON "SecurityEvent"("userId");

-- CreateIndex
CREATE INDEX "SecurityEvent_isRead_idx" ON "SecurityEvent"("isRead");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "GlobalFeeStructure_schoolId_academicYearId_idx" ON "GlobalFeeStructure"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "GlobalFeeStructure_classId_idx" ON "GlobalFeeStructure"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalFeeStructure_schoolId_academicYearId_classId_key" ON "GlobalFeeStructure"("schoolId", "academicYearId", "classId");

-- CreateIndex
CREATE INDEX "GlobalFeeParticular_globalFeeStructureId_idx" ON "GlobalFeeParticular"("globalFeeStructureId");

-- CreateIndex
CREATE INDEX "FeeInstallmentRule_globalFeeStructureId_idx" ON "FeeInstallmentRule"("globalFeeStructureId");

-- CreateIndex
CREATE INDEX "FeeInstallmentRule_dueDate_idx" ON "FeeInstallmentRule"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "FeeInstallmentRule_globalFeeStructureId_installmentNumber_key" ON "FeeInstallmentRule"("globalFeeStructureId", "installmentNumber");

-- CreateIndex
CREATE INDEX "StudentFee_schoolId_academicYearId_idx" ON "StudentFee"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentFee_status_idx" ON "StudentFee"("status");

-- CreateIndex
CREATE INDEX "StudentFee_studentId_idx" ON "StudentFee"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFee_studentId_academicYearId_key" ON "StudentFee"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentFeeParticular_studentFeeId_idx" ON "StudentFeeParticular"("studentFeeId");

-- CreateIndex
CREATE INDEX "StudentFeeParticular_status_idx" ON "StudentFeeParticular"("status");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_studentFeeId_idx" ON "StudentFeeInstallment"("studentFeeId");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_status_idx" ON "StudentFeeInstallment"("status");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_dueDate_idx" ON "StudentFeeInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_isOverdue_idx" ON "StudentFeeInstallment"("isOverdue");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeInstallment_studentFeeId_installmentNumber_key" ON "StudentFeeInstallment"("studentFeeId", "installmentNumber");

-- CreateIndex
CREATE INDEX "FeeDiscount_studentFeeId_idx" ON "FeeDiscount"("studentFeeId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_transactionId_key" ON "FeePayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_receiptNumber_key" ON "FeePayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "FeePayment_studentFeeId_idx" ON "FeePayment"("studentFeeId");

-- CreateIndex
CREATE INDEX "FeePayment_studentId_idx" ON "FeePayment"("studentId");

-- CreateIndex
CREATE INDEX "FeePayment_schoolId_academicYearId_idx" ON "FeePayment"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "FeePayment_status_idx" ON "FeePayment"("status");

-- CreateIndex
CREATE INDEX "FeePayment_paymentDate_idx" ON "FeePayment"("paymentDate");

-- CreateIndex
CREATE INDEX "FeePayment_receiptNumber_idx" ON "FeePayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "FeePaymentInstallment_paymentId_idx" ON "FeePaymentInstallment"("paymentId");

-- CreateIndex
CREATE INDEX "FeePaymentInstallment_installmentId_idx" ON "FeePaymentInstallment"("installmentId");

-- CreateIndex
CREATE INDEX "FeeReminder_studentId_idx" ON "FeeReminder"("studentId");

-- CreateIndex
CREATE INDEX "FeeReminder_scheduledDate_idx" ON "FeeReminder"("scheduledDate");

-- CreateIndex
CREATE INDEX "FeeReminder_status_idx" ON "FeeReminder"("status");

-- CreateIndex
CREATE INDEX "CalendarEvent_schoolId_idx" ON "CalendarEvent"("schoolId");

-- CreateIndex
CREATE INDEX "CalendarEvent_startDate_idx" ON "CalendarEvent"("startDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_endDate_idx" ON "CalendarEvent"("endDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_eventType_idx" ON "CalendarEvent"("eventType");

-- CreateIndex
CREATE INDEX "CalendarEvent_category_idx" ON "CalendarEvent"("category");

-- CreateIndex
CREATE INDEX "CalendarEvent_status_idx" ON "CalendarEvent"("status");

-- CreateIndex
CREATE INDEX "CalendarEventTarget_eventId_idx" ON "CalendarEventTarget"("eventId");

-- CreateIndex
CREATE INDEX "CalendarEventTarget_classId_idx" ON "CalendarEventTarget"("classId");

-- CreateIndex
CREATE INDEX "CalendarEventTarget_sectionId_idx" ON "CalendarEventTarget"("sectionId");

-- CreateIndex
CREATE INDEX "CalendarEventTarget_userId_idx" ON "CalendarEventTarget"("userId");

-- CreateIndex
CREATE INDEX "EventReminder_eventId_idx" ON "EventReminder"("eventId");

-- CreateIndex
CREATE INDEX "EventReminder_scheduledAt_idx" ON "EventReminder"("scheduledAt");

-- CreateIndex
CREATE INDEX "EventReminder_isSent_idx" ON "EventReminder"("isSent");

-- CreateIndex
CREATE INDEX "OnlineExamQuestion_examId_idx" ON "OnlineExamQuestion"("examId");

-- CreateIndex
CREATE INDEX "StudentExamAttempt_examId_idx" ON "StudentExamAttempt"("examId");

-- CreateIndex
CREATE INDEX "StudentExamAttempt_studentId_idx" ON "StudentExamAttempt"("studentId");

-- CreateIndex
CREATE INDEX "StudentExamAnswer_attemptId_idx" ON "StudentExamAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "StudentExamAnswer_questionId_idx" ON "StudentExamAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamHallInvigilator_examId_hallId_teacherId_key" ON "ExamHallInvigilator"("examId", "hallId", "teacherId");

-- CreateIndex
CREATE INDEX "HallAttendance_examId_idx" ON "HallAttendance"("examId");

-- CreateIndex
CREATE INDEX "HallAttendance_hallId_idx" ON "HallAttendance"("hallId");

-- CreateIndex
CREATE UNIQUE INDEX "HallAttendance_examId_studentId_key" ON "HallAttendance"("examId", "studentId");

-- CreateIndex
CREATE INDEX "PromotionHistory_studentId_idx" ON "PromotionHistory"("studentId");

-- CreateIndex
CREATE INDEX "PromotionHistory_fromClassId_idx" ON "PromotionHistory"("fromClassId");

-- CreateIndex
CREATE INDEX "PromotionHistory_toClassId_idx" ON "PromotionHistory"("toClassId");

-- CreateIndex
CREATE INDEX "PromotionHistory_fromYearId_idx" ON "PromotionHistory"("fromYearId");

-- CreateIndex
CREATE INDEX "MediaLibrary_schoolId_idx" ON "MediaLibrary"("schoolId");

-- CreateIndex
CREATE INDEX "MediaLibrary_uploadedById_idx" ON "MediaLibrary"("uploadedById");

-- CreateIndex
CREATE INDEX "MediaLibrary_uploadedAt_idx" ON "MediaLibrary"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Alumni_originalStudentId_key" ON "Alumni"("originalStudentId");

-- CreateIndex
CREATE INDEX "Alumni_schoolId_idx" ON "Alumni"("schoolId");

-- CreateIndex
CREATE INDEX "Alumni_graduationYear_idx" ON "Alumni"("graduationYear");

-- CreateIndex
CREATE INDEX "Alumni_leavingReason_idx" ON "Alumni"("leavingReason");

-- CreateIndex
CREATE INDEX "Alumni_email_idx" ON "Alumni"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollConfig_schoolId_key" ON "PayrollConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollProfile_userId_key" ON "EmployeePayrollProfile"("userId");

-- CreateIndex
CREATE INDEX "EmployeePayrollProfile_schoolId_idx" ON "EmployeePayrollProfile"("schoolId");

-- CreateIndex
CREATE INDEX "EmployeePayrollProfile_userId_idx" ON "EmployeePayrollProfile"("userId");

-- CreateIndex
CREATE INDEX "EmployeePayrollProfile_employeeType_idx" ON "EmployeePayrollProfile"("employeeType");

-- CreateIndex
CREATE INDEX "EmployeePayrollProfile_isActive_idx" ON "EmployeePayrollProfile"("isActive");

-- CreateIndex
CREATE INDEX "SalaryStructure_schoolId_idx" ON "SalaryStructure"("schoolId");

-- CreateIndex
CREATE INDEX "SalaryStructure_isActive_idx" ON "SalaryStructure"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryStructure_schoolId_name_key" ON "SalaryStructure"("schoolId", "name");

-- CreateIndex
CREATE INDEX "PayrollPeriod_schoolId_idx" ON "PayrollPeriod"("schoolId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_status_idx" ON "PayrollPeriod"("status");

-- CreateIndex
CREATE INDEX "PayrollPeriod_month_year_idx" ON "PayrollPeriod"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_schoolId_month_year_key" ON "PayrollPeriod"("schoolId", "month", "year");

-- CreateIndex
CREATE INDEX "PayrollItem_periodId_idx" ON "PayrollItem"("periodId");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollItem_paymentStatus_idx" ON "PayrollItem"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_periodId_employeeId_key" ON "PayrollItem"("periodId", "employeeId");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- CreateIndex
CREATE INDEX "Payslip_month_year_idx" ON "Payslip"("month", "year");

-- CreateIndex
CREATE INDEX "Payslip_status_idx" ON "Payslip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_employeeId_month_year_key" ON "Payslip"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "EmployeeDeduction_employeeId_idx" ON "EmployeeDeduction"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDeduction_isActive_idx" ON "EmployeeDeduction"("isActive");

-- CreateIndex
CREATE INDEX "EmployeeLoan_employeeId_idx" ON "EmployeeLoan"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeLoan_status_idx" ON "EmployeeLoan"("status");

-- CreateIndex
CREATE INDEX "LoanRepayment_loanId_idx" ON "LoanRepayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanRepayment_status_idx" ON "LoanRepayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoanRepayment_loanId_month_year_key" ON "LoanRepayment"("loanId", "month", "year");

-- CreateIndex
CREATE INDEX "LeaveBucket_schoolId_idx" ON "LeaveBucket"("schoolId");

-- CreateIndex
CREATE INDEX "LeaveBucket_academicYearId_idx" ON "LeaveBucket"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBucket_schoolId_academicYearId_leaveType_key" ON "LeaveBucket"("schoolId", "academicYearId", "leaveType");

-- CreateIndex
CREATE INDEX "PayrollAuditLog_schoolId_idx" ON "PayrollAuditLog"("schoolId");

-- CreateIndex
CREATE INDEX "PayrollAuditLog_entityType_entityId_idx" ON "PayrollAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PayrollAuditLog_performedBy_idx" ON "PayrollAuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "PayrollAuditLog_createdAt_idx" ON "PayrollAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "_SubjectToTeachingStaff_B_index" ON "_SubjectToTeachingStaff"("B");

-- AddForeignKey
ALTER TABLE "SchoolPublicProfile" ADD CONSTRAINT "SchoolPublicProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAchievement" ADD CONSTRAINT "SchoolAchievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SchoolPublicProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolFacility" ADD CONSTRAINT "SchoolFacility_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SchoolPublicProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolBadge" ADD CONSTRAINT "SchoolBadge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SchoolPublicProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGallery" ADD CONSTRAINT "SchoolGallery_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SchoolPublicProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRating" ADD CONSTRAINT "SchoolRating_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SchoolPublicProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionInquiry" ADD CONSTRAINT "AdmissionInquiry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SchoolPublicProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLead" ADD CONSTRAINT "PartnerLead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLead" ADD CONSTRAINT "PartnerLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PartnerLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchool" ADD CONSTRAINT "PartnerSchool_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchool" ADD CONSTRAINT "PartnerSchool_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "PartnerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerActivity" ADD CONSTRAINT "PartnerActivity_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageHistory" ADD CONSTRAINT "StageHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageHistory" ADD CONSTRAINT "StageHistory_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageHistory" ADD CONSTRAINT "StageHistory_movedById_fkey" FOREIGN KEY ("movedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocation" ADD CONSTRAINT "VehicleLocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySale" ADD CONSTRAINT "InventorySale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySaleItem" ADD CONSTRAINT "InventorySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "InventorySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySaleItem" ADD CONSTRAINT "InventorySaleItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeTarget" ADD CONSTRAINT "NoticeTarget_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeTarget" ADD CONSTRAINT "NoticeTarget_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeTarget" ADD CONSTRAINT "NoticeTarget_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeTarget" ADD CONSTRAINT "NoticeTarget_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeTarget" ADD CONSTRAINT "NoticeTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailAccount" ADD CONSTRAINT "GmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterAdmin" ADD CONSTRAINT "MasterAdmin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterAdmin" ADD CONSTRAINT "MasterAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParentLink" ADD CONSTRAINT "StudentParentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParentLink" ADD CONSTRAINT "StudentParentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeries" ADD CONSTRAINT "ExamSeries_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamIssue" ADD CONSTRAINT "ExamIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingStaff" ADD CONSTRAINT "TeachingStaff_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingStaff" ADD CONSTRAINT "TeachingStaff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingStaff" ADD CONSTRAINT "TeachingStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingStaff" ADD CONSTRAINT "TeachingStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "TeachingStaff"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "TeachingStaff"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeachingStaff"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherShift" ADD CONSTRAINT "TeacherShift_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherShift" ADD CONSTRAINT "TeacherShift_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherShift" ADD CONSTRAINT "TeacherShift_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherShift" ADD CONSTRAINT "TeacherShift_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherShift" ADD CONSTRAINT "TeacherShift_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeachingStaff"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherShift" ADD CONSTRAINT "TeacherShift_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableTemplate" ADD CONSTRAINT "TimetableTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableTemplate" ADD CONSTRAINT "TimetableTemplate_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHall" ADD CONSTRAINT "ExamHall_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAllocation" ADD CONSTRAINT "SeatAllocation_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAllocation" ADD CONSTRAINT "SeatAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAllocation" ADD CONSTRAINT "SeatAllocation_examHallId_fkey" FOREIGN KEY ("examHallId") REFERENCES "ExamHall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "Student"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeParticular" ADD CONSTRAINT "FeeParticular_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "Student"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentParticular" ADD CONSTRAINT "InstallmentParticular_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "StudentFeeInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentParticular" ADD CONSTRAINT "InstallmentParticular_particularId_fkey" FOREIGN KEY ("particularId") REFERENCES "StudentFeeParticular"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDelegation" ADD CONSTRAINT "AttendanceDelegation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDelegation" ADD CONSTRAINT "AttendanceDelegation_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDelegation" ADD CONSTRAINT "AttendanceDelegation_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDelegation" ADD CONSTRAINT "AttendanceDelegation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDelegation" ADD CONSTRAINT "AttendanceDelegation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDelegation" ADD CONSTRAINT "AttendanceDelegation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCalendar" ADD CONSTRAINT "SchoolCalendar_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConfig" ADD CONSTRAINT "AttendanceConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceStats" ADD CONSTRAINT "AttendanceStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceStats" ADD CONSTRAINT "AttendanceStats_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceStats" ADD CONSTRAINT "AttendanceStats_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkAttendance" ADD CONSTRAINT "BulkAttendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkAttendance" ADD CONSTRAINT "BulkAttendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkAttendance" ADD CONSTRAINT "BulkAttendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkAttendance" ADD CONSTRAINT "BulkAttendance_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDocument" ADD CONSTRAINT "AttendanceDocument_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveDocument" ADD CONSTRAINT "LeaveDocument_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceNotification" ADD CONSTRAINT "AttendanceNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceNotification" ADD CONSTRAINT "AttendanceNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBookCopy" ADD CONSTRAINT "LibraryBookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryTransaction" ADD CONSTRAINT "LibraryTransaction_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "LibraryBookCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBookRequest" ADD CONSTRAINT "LibraryBookRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBookRequest" ADD CONSTRAINT "LibraryBookRequest_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBookRequest" ADD CONSTRAINT "LibraryBookRequest_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "LibraryBookCopy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSignature" ADD CONSTRAINT "TemplateSignature_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSignature" ADD CONSTRAINT "TemplateSignature_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "Signature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateStamp" ADD CONSTRAINT "TemplateStamp_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateStamp" ADD CONSTRAINT "TemplateStamp_stampId_fkey" FOREIGN KEY ("stampId") REFERENCES "Stamp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrVerificationSettings" ADD CONSTRAINT "QrVerificationSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfExportSettings" ADD CONSTRAINT "PdfExportSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalIdCard" ADD CONSTRAINT "DigitalIdCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalIdCard" ADD CONSTRAINT "DigitalIdCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalIdCard" ADD CONSTRAINT "DigitalIdCard_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmitCard" ADD CONSTRAINT "AdmitCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmitCard" ADD CONSTRAINT "AdmitCard_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmitCard" ADD CONSTRAINT "AdmitCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalFeeStructure" ADD CONSTRAINT "GlobalFeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalFeeStructure" ADD CONSTRAINT "GlobalFeeStructure_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalFeeStructure" ADD CONSTRAINT "GlobalFeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalFeeParticular" ADD CONSTRAINT "GlobalFeeParticular_globalFeeStructureId_fkey" FOREIGN KEY ("globalFeeStructureId") REFERENCES "GlobalFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallmentRule" ADD CONSTRAINT "FeeInstallmentRule_globalFeeStructureId_fkey" FOREIGN KEY ("globalFeeStructureId") REFERENCES "GlobalFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_globalFeeStructureId_fkey" FOREIGN KEY ("globalFeeStructureId") REFERENCES "GlobalFeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeParticular" ADD CONSTRAINT "StudentFeeParticular_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeParticular" ADD CONSTRAINT "StudentFeeParticular_globalParticularId_fkey" FOREIGN KEY ("globalParticularId") REFERENCES "GlobalFeeParticular"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeParticular" ADD CONSTRAINT "StudentFeeParticular_feeParticularId_fkey" FOREIGN KEY ("feeParticularId") REFERENCES "FeeParticular"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeParticular" ADD CONSTRAINT "StudentFeeParticular_studentFeeStructureId_fkey" FOREIGN KEY ("studentFeeStructureId") REFERENCES "StudentFeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeInstallment" ADD CONSTRAINT "StudentFeeInstallment_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeInstallment" ADD CONSTRAINT "StudentFeeInstallment_installmentRuleId_fkey" FOREIGN KEY ("installmentRuleId") REFERENCES "FeeInstallmentRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeDiscount" ADD CONSTRAINT "FeeDiscount_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeDiscount" ADD CONSTRAINT "FeeDiscount_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_collectedBy_fkey" FOREIGN KEY ("collectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentFeeStructureId_fkey" FOREIGN KEY ("studentFeeStructureId") REFERENCES "StudentFeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePaymentInstallment" ADD CONSTRAINT "FeePaymentInstallment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePaymentInstallment" ADD CONSTRAINT "FeePaymentInstallment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "StudentFeeInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeReminder" ADD CONSTRAINT "FeeReminder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventTarget" ADD CONSTRAINT "CalendarEventTarget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventTarget" ADD CONSTRAINT "CalendarEventTarget_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventTarget" ADD CONSTRAINT "CalendarEventTarget_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventTarget" ADD CONSTRAINT "CalendarEventTarget_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventTarget" ADD CONSTRAINT "CalendarEventTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExamQuestion" ADD CONSTRAINT "OnlineExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAttempt" ADD CONSTRAINT "StudentExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAttempt" ADD CONSTRAINT "StudentExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAnswer" ADD CONSTRAINT "StudentExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "StudentExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAnswer" ADD CONSTRAINT "StudentExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "OnlineExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHallInvigilator" ADD CONSTRAINT "ExamHallInvigilator_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHallInvigilator" ADD CONSTRAINT "ExamHallInvigilator_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "ExamHall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHallInvigilator" ADD CONSTRAINT "ExamHallInvigilator_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallAttendance" ADD CONSTRAINT "HallAttendance_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallAttendance" ADD CONSTRAINT "HallAttendance_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "ExamHall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallAttendance" ADD CONSTRAINT "HallAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_toClassId_fkey" FOREIGN KEY ("toClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_fromYearId_fkey" FOREIGN KEY ("fromYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_toYearId_fkey" FOREIGN KEY ("toYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_promotedBy_fkey" FOREIGN KEY ("promotedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLibrary" ADD CONSTRAINT "MediaLibrary_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLibrary" ADD CONSTRAINT "MediaLibrary_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_lastClassId_fkey" FOREIGN KEY ("lastClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_lastSectionId_fkey" FOREIGN KEY ("lastSectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollConfig" ADD CONSTRAINT "PayrollConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollProfile" ADD CONSTRAINT "EmployeePayrollProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollProfile" ADD CONSTRAINT "EmployeePayrollProfile_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "SalaryStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeePayrollProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeePayrollProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeduction" ADD CONSTRAINT "EmployeeDeduction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeePayrollProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeePayrollProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "EmployeeLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBucket" ADD CONSTRAINT "LeaveBucket_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAuditLog" ADD CONSTRAINT "PayrollAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubjectToTeachingStaff" ADD CONSTRAINT "_SubjectToTeachingStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubjectToTeachingStaff" ADD CONSTRAINT "_SubjectToTeachingStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "TeachingStaff"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
