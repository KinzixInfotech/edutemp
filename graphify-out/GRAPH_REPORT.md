# Graph Report - edutemp  (2026-04-29)

## Corpus Check
- 1319 files · ~3,051,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4134 nodes · 7059 edges · 37 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 1857 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `POST()` - 218 edges
3. `useAuth()` - 209 edges
4. `GET()` - 181 edges
5. `Error()` - 145 edges
6. `slice()` - 111 edges
7. `includes()` - 90 edges
8. `from()` - 88 edges
9. `toString()` - 79 edges
10. `get()` - 79 edges

## Surprising Connections (you probably didn't know these)
- `getHealthMetrics()` --calls--> `GET()`  [INFERRED]
  src\middleware.js → src\app\dashboard\schools\[schoolId]\students\route.js
- `Error()` --calls--> `enqueueAttendancePostProcessing()`  [INFERRED]
  src\app\error.jsx → src\app\api\schools\[schoolId]\attendance\mark\route.js
- `Error()` --calls--> `markAttendance()`  [INFERRED]
  src\app\error.jsx → src\components\profile.jsx
- `Error()` --calls--> `logCapacityExceeded()`  [INFERRED]
  src\app\error.jsx → src\lib\subscription\capacityHelper.js
- `FeaturesSection()` --calls--> `from()`  [INFERRED]
  src\app\page.jsx → src\app\generated\prisma\runtime\wasm-compiler-edge.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (268): getSchoolIdFromRequest(), resolveSchoolIdByLookup(), verifyAdminAccess(), verifyAuth(), verifyAuthWithRole(), verifyRoleAccess(), withSchoolAccess(), apiResponse() (+260 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (427): #a(), aa(), ac(), Ad(), addErrorMessage(), addField(), addItem(), addMarginSymbol() (+419 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (364): generate(), Pa(), _e(), I(), _(), aa(), ac(), addErrorMessage() (+356 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (192): AcademicYearProvider(), AcademicYearSetupBannerProvider(), paginate(), AssignmentsTab(), useAuth(), BreadcrumbHeader(), CommandMenu(), FileUploadButton() (+184 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (196): AccordionContent(), AccordionItem(), AccordionTrigger(), AdminTodoWidget(), Alert(), AlertDescription(), AlertTitle(), AlertDialogAction() (+188 more)

### Community 5 - "Community 5"
Cohesion: 0.01
Nodes (109): AlumniConversionDialog(), SidebarSkeleton(), AtlasAchievementDialog(), AttendanceTable(), main(), BuilderSection(), checkCapacity(), logCapacityExceeded() (+101 more)

### Community 6 - "Community 6"
Cohesion: 0.01
Nodes (97): DailyStatsCards(), fetchChartData(), fetchDailyStats(), PieTooltip(), downloadExcel(), exportClassWiseToExcel(), exportDefaultersToExcel(), exportLeaveAnalysisToExcel() (+89 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (86): createJobId(), getBulkJob(), getJobKey(), listBulkJobs(), setBulkJob(), updateBulkJob(), checkBusStatus(), getDistanceMeters() (+78 more)

### Community 8 - "Community 8"
Cohesion: 0.02
Nodes (80): AttendanceReminderProvider(), generateSchoolSlug(), generateUniqueSlug(), main(), slugify(), Calendar(), CalendarDayButton(), CertificateDesignEditor() (+72 more)

### Community 9 - "Community 9"
Cohesion: 0.03
Nodes (82): buildRuleKey(), finalizeAttendance(), isWithinWindow(), processAttendanceLifecycleWorker(), queueNotification(), sendGroupedNotifications(), calculateOvertimeHours(), calculateWorkingHours() (+74 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (37): getAccountCredentialsEmailTemplate(), sendBulkEmails(), sendEmail(), sendWithNodemailer(), sendWithResend(), sendWithSendGrid(), deleteFileByUrl(), deleteFromR2() (+29 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (20): $(), a(), F, fe(), G(), ge(), J(), k() (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (2): FeaturesSection(), TestimonialsSection()

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (23): applyTextStyles(), createPdfBlobFromLayout(), downloadPdfFromLayout(), getImageFormat(), getPdfFormat(), renderBackground(), renderImage(), renderPdfFromLayout() (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (17): ChatView(), ConversationItem(), ConversationSidebar(), formatTime(), MessageBubble(), NewChatModal(), PublicExamPage(), SelfAttendancePage() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (13): AtlasGalleryUploadDialog(), extractImagesFromZip(), getExtension(), isImageFile(), useBulkUpload(), BulkUploadDialog(), BulkUploadToast(), extractImagesFromZip() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.1
Nodes (10): DocsPageClient(), DocsTableOfContents(), getIcon(), SearchModal(), VerificationPage(), extractHeadings(), slugify(), useDocBySlug() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (7): AiInsightsCard(), useAiInsights(), useDashboardContext(), useDashboardInsights(), getInitials(), useTypingEffect(), WelcomeBanner()

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (13): applyMappingsToTemplateElements(), buildCertificateMappingContext(), buildDocumentMappingContext(), buildExamScheduleText(), buildResolvedMappings(), buildResolvedTemplateConfig(), extractTemplatePlaceholders(), formatDate() (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.28
Nodes (2): ApiLoaderState, load()

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (2): calculateDistance(), enqueueAttendancePostProcessing()

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (2): NS(), toNum()

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (5): DataLoader, MergedExtensionsList, RequestHandler, Skip, TypedSql

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (4): AnyNull, DbNull, JsonNull, PrismaClient

### Community 27 - "Community 27"
Cohesion: 0.7
Nodes (4): getHPCReportData(), groupActivitiesByCategory(), groupCompetenciesBySubject(), groupSELByCategory()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (1): PaymentAdapter

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (1): safeJSON()

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): normalizeSignaturePayload()

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (1): normalizeProfile()

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (1): getDayName()

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (2): countActiveFilters(), SchoolFilters()

### Community 42 - "Community 42"
Cohesion: 0.83
Nodes (3): buildContactAdminNotificationTemplate(), buildContactThankYouTemplate(), escapeHtml()

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (2): getQueryKeysForRoute(), hasPrefetchConfig()

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (1): AboutPage()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (1): normalizeParam()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (1): PrismaClient

## Knowledge Gaps
- **9 isolated node(s):** `PrismaClient`, `DbNull`, `JsonNull`, `AnyNull`, `DataLoader` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (33 nodes): `AboutBriefSection()`, `AppGlimpseSection()`, `AppShowcaseSection()`, `AttendanceSection()`, `BenefitsSection()`, `BentoSection()`, `BusTrackingSection()`, `CommissionSection()`, `CommunicatingSeamlesslySection()`, `FAQSection()`, `FeatureBadge()`, `FeaturesSection()`, `FinalCTASection()`, `Footer()`, `HeroSection()`, `HomePage()`, `HowItWorksSection()`, `HPCSection()`, `IntegrationsSection()`, `MacbookMockupSection()`, `MarqueeBanner()`, `PartnersPage()`, `PartnerTeaser()`, `PartnerTypesSection()`, `PricingSection()`, `RoleBadge()`, `SchoolExplorerSection()`, `StatsSection()`, `TestimonialsSection()`, `TrustedSection()`, `WhyPartnerSection()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (9 nodes): `ApiLoaderState`, `.notify()`, `.start()`, `.stop()`, `.subscribe()`, `TopProgressBar.js`, `api-loader.js`, `load()`, `stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (6 nodes): `calculateDistance()`, `enqueueAttendancePostProcessing()`, `getMonthlyStats()`, `logAttendanceDebug()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (6 nodes): `NS()`, `toNum()`, `route.js`, `route.js`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (5 nodes): `PaymentAdapter`, `.constructor()`, `.initiatePayment()`, `.verifyPayment()`, `PaymentAdapter.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `safeJSON()`, `route.js`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `normalizeSignaturePayload()`, `parseOptionalInt()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `findProfile()`, `normalizeProfile()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `addDays()`, `getDayName()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (4 nodes): `countActiveFilters()`, `formatSliderValue()`, `SchoolFilters()`, `SchoolFilters.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (4 nodes): `createPrefetchConfig()`, `getQueryKeysForRoute()`, `hasPrefetchConfig()`, `route-prefetch-map.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `RootLayout()`, `layout.js`, `layout.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `AboutPage()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `normalizeParam()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `PrismaClient`, `.constructor()`, `index-browser.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 3` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 13`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `slice()` connect `Community 5` to `Community 0`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 17`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `from()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 18`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 222 inferred relationships involving `cn()` (e.g. with `CropImageDialog()` and `SchoolCalendar()`) actually correct?**
  _`cn()` has 222 INFERRED edges - model-reasoned connections that need verification._
- **Are the 158 inferred relationships involving `POST()` (e.g. with `includes()` and `update()`) actually correct?**
  _`POST()` has 158 INFERRED edges - model-reasoned connections that need verification._
- **Are the 208 inferred relationships involving `useAuth()` (e.g. with `AssignmentsTab()` and `SignaturesTab()`) actually correct?**
  _`useAuth()` has 208 INFERRED edges - model-reasoned connections that need verification._
- **Are the 71 inferred relationships involving `GET()` (e.g. with `verifyAdminAccess()` and `Error()`) actually correct?**
  _`GET()` has 71 INFERRED edges - model-reasoned connections that need verification._