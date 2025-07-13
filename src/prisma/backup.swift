//BACKUP

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model PlatformAdmin {
  id       String   @id @default(uuid())
  email    String   @unique
  name     String
  role     AdminRole // enum: MASTER | EMPLOYEE | VIEWER
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model School {
  id               String   @id @default(uuid())
  name             String
  location         String
  currentDomain    String
  customDomain     String
  type             String
  subscriptionType String
  logo             String?
  timezone         String?  @default("Asia/Kolkata")
  language         String?  @default("en")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  admins        Admin[]
  users         User[]
  profiles      Profile[]
  students      Student[]
  teachers      Teacher[]
  accountants   Accountant[]
  parents       Parent[]
  busDrivers    BusDriver[]
  librarians    Librarian[]
  peons         Peon[]
  labAssistants LabAssistant[]
  employees     Employee[]
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  dob          DateTime
  mobile       String?
  bloodGroup   String?
  address      String?
  profilePhoto String?
  meta         Json?
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String
  school   School    @relation(fields: [schoolId], references: [id])
  profiles Profile[]
  Admin    Admin?
  Student  Student[]
}

model Profile {
  id            String   @id @default(uuid())
  role          String
  permissions   String[]
  meta          Json?
  schoolId      String
  school        School   @relation(fields: [schoolId], references: [id])
  assignedUsers User[]

  Teacher      Teacher?
  Parent       Parent?
  BusDriver    BusDriver?
  Librarian    Librarian?
  Peon         Peon?
  LabAssistant LabAssistant?
  Accountant   Accountant?
}

model Admin {
  id       String @id @default(uuid())
  userId   String @unique
  schoolId String
  user     User   @relation(fields: [userId], references: [id])
  school   School @relation(fields: [schoolId], references: [id])
}

model Teacher {
  id           String   @id @default(uuid())
  profileId    String   @unique
  name         String
  email        String   @unique
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  class        String
  certificates String[]
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String
  school   School    @relation(fields: [schoolId], references: [id])
  profile  Profile   @relation(fields: [profileId], references: [id])
  students Student[]
}

model Student {
  id           String   @id @default(uuid())
  name         String
  email        String
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  location     String
  class        String
  results      Json
  parentIds    String[]
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  // ✅ Keep this relation:
  teacherId String?
  teacher   Teacher? @relation(fields: [teacherId], references: [id])

  schoolId String
  school   School   @relation(fields: [schoolId], references: [id])
  parents  Parent[]
  User     User?    @relation(fields: [userId], references: [id])
  userId   String?
}

model Parent {
  id           String   @id @default(uuid())
  profileId    String   @unique
  guardianName         String
  email        String   @unique
  bloodGroup   String?
  profilePhoto String?
  fatherName   String?
  motherName   String?
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  childId String
  child   Student @relation(fields: [childId], references: [id])

  schoolId String
  school   School  @relation(fields: [schoolId], references: [id])
  profile  Profile @relation(fields: [profileId], references: [id])
}

model BusDriver {
  id           String   @id @default(uuid())
  profileId    String   @unique
  name         String
  email        String   @unique
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  address      String
  busNumber    String
  studentCount Int
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String
  school   School  @relation(fields: [schoolId], references: [id])
  profile  Profile @relation(fields: [profileId], references: [id])
}

model Librarian {
  id           String   @id @default(uuid())
  profileId    String   @unique
  name         String
  email        String   @unique
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  location     String
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String
  school   School  @relation(fields: [schoolId], references: [id])
  profile  Profile @relation(fields: [profileId], references: [id])
}

model Peon {
  id           String   @id @default(uuid())
  profileId    String   @unique
  name         String
  email        String   @unique
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  address      String
  role         String
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String
  school   School  @relation(fields: [schoolId], references: [id])
  profile  Profile @relation(fields: [profileId], references: [id])
}

model LabAssistant {
  id           String   @id @default(uuid())
  profileId    String   @unique
  name         String
  email        String   @unique
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  address      String
  labName      String
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String
  school   School  @relation(fields: [schoolId], references: [id])
  profile  Profile @relation(fields: [profileId], references: [id])
}

model Employee {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  position     String
  photo        String?
  joinedAt     DateTime @default(now())
  meta         Json?
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String?
  School   School? @relation(fields: [schoolId], references: [id])
}

model Accountant {
  id           String   @id @default(uuid())
  profileId    String   @unique
  name         String
  email        String   @unique
  mobile       String
  dob          DateTime
  bloodGroup   String
  profilePhoto String?
  certificates String[]
  createdAt    DateTime @default(now())
  updatedAt DateTime @updatedAt @default(now())


  schoolId String
  school   School  @relation(fields: [schoolId], references: [id])
  profile  Profile @relation(fields: [profileId], references: [id])
}

enum AdminRole {
  MASTER     // Can do everything
  EMPLOYEE   // Can manage data, but not system config
  VIEWER     // Read-only access
}