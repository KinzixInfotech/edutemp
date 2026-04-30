# Graph Report - edutemp  (2026-04-30)

## Corpus Check
- 1324 files · ~3,056,522 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4171 nodes · 7154 edges · 41 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 1890 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `POST()` - 218 edges
3. `useAuth()` - 209 edges
4. `GET()` - 185 edges
5. `Error()` - 145 edges
6. `slice()` - 112 edges
7. `includes()` - 91 edges
8. `from()` - 89 edges
9. `get()` - 80 edges
10. `toString()` - 79 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `slice()`  [INFERRED]
  cleanup-duplicate-classes.js → src\app\generated\prisma\runtime\wasm-compiler-edge.js
- `getHealthMetrics()` --calls--> `GET()`  [INFERRED]
  src\middleware.js → src\app\dashboard\schools\[schoolId]\students\route.js
- `Error()` --calls--> `markAttendance()`  [INFERRED]
  src\app\error.jsx → src\components\profile.jsx
- `Error()` --calls--> `logCapacityExceeded()`  [INFERRED]
  src\app\error.jsx → src\lib\subscription\capacityHelper.js
- `FeaturesSection()` --calls--> `from()`  [INFERRED]
  src\app\page.jsx → src\app\generated\prisma\runtime\wasm-compiler-edge.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (292): AcademicYearProvider(), AcademicYearSetupBannerProvider(), AlumniConversionDialog(), paginate(), AssignmentsTab(), AtlasAchievementDialog(), AttendanceTable(), useAuth() (+284 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (409): #a(), aa(), ac(), Ad(), addErrorMessage(), addField(), addItem(), addMarginSymbol() (+401 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (390): as(), generate(), handleAndLogRequestError(), kc(), Pa(), Vo(), updateSession(), de() (+382 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (194): getFeatureAccessSnapshotForRequest(), getPathnameFromRequest(), getSchoolIdFromRequest(), resolveSchoolIdByLookup(), verifyAdminAccess(), verifyAuth(), verifyAuthWithRole(), verifyRoleAccess() (+186 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (209): AccordionContent(), AccordionItem(), AccordionTrigger(), AdminTodoWidget(), Alert(), AlertDescription(), AlertTitle(), AlertDialogAction() (+201 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (155): buildRuleKey(), finalizeAttendance(), isWithinWindow(), processAttendanceLifecycleWorker(), queueNotification(), sendGroupedNotifications(), AutoStatuspageSync, applyMappingsToTemplateElements() (+147 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (72): checkCapacity(), logCapacityExceeded(), $(), Fn(), DocsPageClient(), DocsTableOfContents(), getIcon(), SearchModal() (+64 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (80): AttendanceReminderProvider(), generateSchoolSlug(), generateUniqueSlug(), main(), slugify(), main(), CertificateDesignEditor(), ElementRenderer() (+72 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (46): AxisAdapter, Calendar(), CalendarDayButton(), refreshGoogleToken(), HDFCAdapter, ICICIAdapter, notifySchoolAccountStatusChange(), allocatePaymentToInstallments() (+38 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (48): checkBusStatus(), getDistanceMeters(), isOperatingHours(), CommandMenu(), checkDailyLimit(), checkDuplicate(), chunkArray(), getDateKey() (+40 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (31): createAttendanceAuditLog(), getBulkJob(), getJobKey(), listBulkJobs(), setBulkJob(), updateBulkJob(), getAccountCredentialsEmailTemplate(), sendBulkEmails() (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (14): DailyStatsCards(), fetchChartData(), fetchDailyStats(), PieTooltip(), checkDuplicate(), createDriver(), fetchConductors(), fetchDrivers() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (20): $(), a(), F, fe(), G(), ge(), I(), J() (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (2): FeaturesSection(), TestimonialsSection()

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (24): applyTextStyles(), createPdfBlobFromLayout(), downloadPdfFromLayout(), getImageFormat(), getPdfFormat(), renderBackground(), renderImage(), renderPdfFromLayout() (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (24): ClientLayout(), StatusIndicator(), buildFeatureLabels(), expandDisabledOverrides(), buildFeaturePolicySnapshot(), buildSchoolFeatureAccessErrorResponse(), getSchoolFeatureAccessSnapshot(), getSchoolFeatureControlConfig() (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.1
Nodes (16): ChatView(), ConversationItem(), ConversationSidebar(), formatTime(), MessageBubble(), NewChatModal(), PublicExamPage(), useConversations() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (13): AtlasGalleryUploadDialog(), extractImagesFromZip(), getExtension(), isImageFile(), useBulkUpload(), BulkUploadDialog(), BulkUploadToast(), extractImagesFromZip() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (7): AiInsightsCard(), useAiInsights(), useDashboardContext(), useDashboardInsights(), getInitials(), useTypingEffect(), WelcomeBanner()

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (9): batchCalculateStreak(), calculateStreak(), generateClassWiseReport(), generateLeaveAnalysis(), generateMonthlyReport(), generateStudentWiseReport(), generateSummaryReport(), generateTeacherReport() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (9): formatCurrency(), generateAttendanceHints(), generateEventHints(), generateExamHints(), generateFeeHints(), generateLiveHints(), getTimePeriod(), getTopHints() (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (4): ChartAreaInteractive(), DraggableRow(), TableCellViewer(), useIsMobile()

### Community 23 - "Community 23"
Cohesion: 0.28
Nodes (2): ApiLoaderState, load()

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (1): getMonthlyTrendReport()

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (1): run()

### Community 26 - "Community 26"
Cohesion: 0.47
Nodes (4): DataField(), FilePreview(), getFileType(), SubmissionDetailPage()

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (5): DataLoader, MergedExtensionsList, RequestHandler, Skip, TypedSql

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (4): AnyNull, DbNull, JsonNull, PrismaClient

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (1): PaymentAdapter

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): safeJSON()

### Community 34 - "Community 34"
Cohesion: 0.5
Nodes (1): normalizeSignaturePayload()

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (1): normalizeProfile()

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (1): getDayName()

### Community 39 - "Community 39"
Cohesion: 0.83
Nodes (3): AttendanceSettings(), calculateDistance(), formatMeters()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (2): countActiveFilters(), SchoolFilters()

### Community 47 - "Community 47"
Cohesion: 0.83
Nodes (3): buildContactAdminNotificationTemplate(), buildContactThankYouTemplate(), escapeHtml()

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (2): getQueryKeysForRoute(), hasPrefetchConfig()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (1): AboutPage()

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (1): normalizeParam()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (1): PrismaClient

## Knowledge Gaps
- **9 isolated node(s):** `PrismaClient`, `DbNull`, `JsonNull`, `AnyNull`, `DataLoader` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (34 nodes): `AboutBriefSection()`, `AppGlimpseSection()`, `AppShowcaseSection()`, `AttendanceSection()`, `BenefitsSection()`, `BentoSection()`, `BusTrackingSection()`, `CommissionSection()`, `CommunicatingSeamlesslySection()`, `EcosystemSection()`, `FAQSection()`, `FeatureBadge()`, `FeaturesSection()`, `FinalCTASection()`, `Footer()`, `HeroSection()`, `HomePage()`, `HowItWorksSection()`, `HPCSection()`, `IntegrationsSection()`, `MacbookMockupSection()`, `MarqueeBanner()`, `PartnersPage()`, `PartnerTeaser()`, `PartnerTypesSection()`, `PricingSection()`, `RoleBadge()`, `SchoolExplorerSection()`, `StatsSection()`, `TestimonialsSection()`, `TrustedSection()`, `WhyPartnerSection()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (9 nodes): `ApiLoaderState`, `.notify()`, `.start()`, `.stop()`, `.subscribe()`, `TopProgressBar.js`, `api-loader.js`, `load()`, `stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (8 nodes): `getClassWiseReport()`, `getCollectionReport()`, `getDashboardReport()`, `getDayCollectionReport()`, `getDefaultersReport()`, `getMonthlyTrendReport()`, `getPaymentMethodsReport()`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (7 nodes): `dedupeClassScopedTables()`, `dedupeSectionScopedTables()`, `cleanup-duplicate-classes.js`, `normalizeName()`, `run()`, `updateForeignKey()`, `updateSectionForeignKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (5 nodes): `PaymentAdapter`, `.constructor()`, `.initiatePayment()`, `.verifyPayment()`, `PaymentAdapter.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `safeJSON()`, `route.js`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `normalizeSignaturePayload()`, `parseOptionalInt()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (4 nodes): `findProfile()`, `normalizeProfile()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `addDays()`, `getDayName()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `countActiveFilters()`, `formatSliderValue()`, `SchoolFilters()`, `SchoolFilters.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (4 nodes): `createPrefetchConfig()`, `getQueryKeysForRoute()`, `hasPrefetchConfig()`, `route-prefetch-map.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `RootLayout()`, `layout.js`, `layout.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (3 nodes): `AboutPage()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `normalizeParam()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `PrismaClient`, `.constructor()`, `index-browser.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 0` to `Community 4`, `Community 6`, `Community 39`, `Community 7`, `Community 9`, `Community 14`, `Community 15`, `Community 17`, `Community 26`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `from()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 13`, `Community 14`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 4` to `Community 0`, `Community 7`, `Community 8`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Are the 222 inferred relationships involving `cn()` (e.g. with `CropImageDialog()` and `SchoolCalendar()`) actually correct?**
  _`cn()` has 222 INFERRED edges - model-reasoned connections that need verification._
- **Are the 158 inferred relationships involving `POST()` (e.g. with `includes()` and `update()`) actually correct?**
  _`POST()` has 158 INFERRED edges - model-reasoned connections that need verification._
- **Are the 208 inferred relationships involving `useAuth()` (e.g. with `AssignmentsTab()` and `SignaturesTab()`) actually correct?**
  _`useAuth()` has 208 INFERRED edges - model-reasoned connections that need verification._
- **Are the 74 inferred relationships involving `GET()` (e.g. with `verifyAdminAccess()` and `Error()`) actually correct?**
  _`GET()` has 74 INFERRED edges - model-reasoned connections that need verification._