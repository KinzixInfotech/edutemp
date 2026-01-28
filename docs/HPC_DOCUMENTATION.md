# HPC (Holistic Progress Card) - Complete Documentation

## Overview

The Holistic Progress Card (HPC) is a NEP 2020 compliant student assessment system that replaces traditional marks-based report cards with comprehensive student profiles.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN (Web Dashboard)                       │
│  /dashboard/hpc/*                                                │
│  ├── Overview (page.jsx)                                         │
│  ├── Competencies (competencies/page.jsx)                        │
│  ├── SEL Parameters (sel/page.jsx)                               │
│  ├── Activities (activities/page.jsx)                            │
│  ├── Term Control (terms/page.jsx)                               │
│  └── Reports (reports/page.jsx)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API ENDPOINTS                            │
│  /api/schools/[schoolId]/hpc/*                                   │
│  ├── /competencies     → CRUD competencies                       │
│  ├── /assessments      → Record grades                           │
│  ├── /activities       → Activity categories                     │
│  ├── /activities/records → Student participation                 │
│  ├── /sel              → SEL parameters                          │
│  ├── /sel/assess       → SEL grades                              │
│  ├── /reflections      → Student self-reflection                 │
│  ├── /feedback/teacher → Teacher feedback                        │
│  ├── /feedback/parent  → Parent feedback                         │
│  └── /report           → Complete HPC aggregation                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Edubreezy)                        │
│  app/(screens)/hpc/*                                             │
│  ├── view.js          → Student views HPC                        │
│  ├── reflection.js    → Student submits reflection               │
│  ├── teacher-assess.js → Teacher grades SEL                      │
│  └── parent-view.js   → Parent views child's HPC                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Flows

### 1. Admin Setup Flow
1. Navigate to **Dashboard → Holistic Progress Card → Overview**
2. Go to **Competencies** → Add subject-wise competencies (e.g., "Problem Solving" for Math)
3. Go to **SEL Parameters** → Add or verify default parameters (run seed script if empty)
4. Go to **Activities** → Add co-curricular categories (Sports, Arts, etc.)
5. Configure parent portal visibility in **Reports** tab

### 2. Teacher Assessment Flow
1. Open Edubreezy mobile app
2. Navigate to HPC section from home
3. Select class/student
4. Go to **SEL Assessment** → Grade each student on behavior parameters
5. Add narrative feedback for each student

### 3. Student Flow
1. Open Edubreezy mobile app
2. Tap **Progress Card** from quick actions
3. View academic grades, activities, SEL scores
4. Go to **My Reflection** → Submit self-reflection for the term
5. Download PDF report

### 4. Parent Flow
1. Open Edubreezy mobile app (logged in as parent)
2. View child's HPC with all sections
3. Optionally add parent feedback/observations
4. Download PDF report

---

## Screen Descriptions

### Mobile App Screens

| Screen | Path | Who Uses | What It Does |
|--------|------|----------|--------------|
| `view.js` | `/hpc/view` | Student | Main HPC display with all grades |
| `reflection.js` | `/hpc/reflection` | Student | Self-reflection form (4 questions) |
| `teacher-assess.js` | `/hpc/teacher-assess` | Teacher | Grade students on SEL parameters |
| `parent-view.js` | `/hpc/parent-view` | Parent | View child's complete HPC |

### Admin Dashboard Pages

| Page | Path | Purpose |
|------|------|---------|
| Overview | `/dashboard/hpc` | Stats and quick access |
| Competencies | `/dashboard/hpc/competencies` | CRUD subject competencies |
| SEL Parameters | `/dashboard/hpc/sel` | CRUD behavior parameters |
| Activities | `/dashboard/hpc/activities` | CRUD activity categories |
| Term Control | `/dashboard/hpc/terms` | Lock/unlock terms |
| Reports | `/dashboard/hpc/reports` | Generate PDFs, export data |

---

## API Usage

### Get Complete HPC Report
```
GET /api/schools/{schoolId}/hpc/report?studentId=xxx&academicYearId=yyy&termNumber=1
```

### Record Competency Grade
```
POST /api/schools/{schoolId}/hpc/assessments
{
  "assessedById": "teacher-uuid",
  "assessments": [{
    "studentId": "student-uuid",
    "competencyId": "comp-uuid",
    "academicYearId": "year-uuid",
    "termNumber": 1,
    "grade": "A",
    "remarks": "Excellent"
  }]
}
```

### Submit Student Reflection
```
POST /api/schools/{schoolId}/hpc/reflections
{
  "studentId": "uuid",
  "academicYearId": "uuid",
  "termNumber": 1,
  "whatILearned": "...",
  "whatIChallenged": "...",
  "whatIWantToImprove": "...",
  "goalsForNextTerm": "..."
}
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| Competency | Subject-wise competencies |
| CompetencyAssessment | Student grades per competency |
| ActivityCategory | Co-curricular categories |
| Activity | Individual activities |
| StudentActivityRecord | Student participation |
| SELParameter | Behavior parameters |
| SELAssessment | Student SEL grades |
| StudentReflection | Self-reflection |
| TeacherFeedback | Teacher narratives |
| ParentFeedback | Parent observations |
| HPCReport | Generated reports |

---

## Setup Commands

```bash
# Initialize default SEL parameters and activity categories
node prisma/seed-hpc-defaults.js

# For a specific school only
node prisma/seed-hpc-defaults.js <schoolId>
```

---

## Grade Scale

| Academic | SEL | Color |
|----------|-----|-------|
| A+ | EXCELLENT | Green |
| A | VERY_GOOD | Light Green |
| B+ | GOOD | Blue |
| B | SATISFACTORY | Light Blue |
| C | - | Amber |
| D | NEEDS_IMPROVEMENT | Red |

---

## Files Created

### Mobile App (Edubreezy)
- `app/(screens)/hpc/_layout.js`
- `app/(screens)/hpc/view.js`
- `app/(screens)/hpc/reflection.js`
- `app/(screens)/hpc/teacher-assess.js`
- `app/(screens)/hpc/parent-view.js`

### Web Dashboard (edutemp)
- `src/app/dashboard/hpc/page.jsx`
- `src/app/dashboard/hpc/competencies/page.jsx`
- `src/app/dashboard/hpc/sel/page.jsx`
- `src/app/dashboard/hpc/activities/page.jsx`
- `src/app/dashboard/hpc/terms/page.jsx`
- `src/app/dashboard/hpc/reports/page.jsx`
- `src/components/hpc/HPCPDFTemplate.jsx`

### Navigation
- Added HPC to student quick actions in `home.js`
- Added HPC section to admin sidebar in `app-sidebar.jsx`
