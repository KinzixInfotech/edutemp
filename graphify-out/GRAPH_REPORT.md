# Graph Report - edutemp  (2026-04-27)

## Corpus Check
- 1303 files · ~3,023,114 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4081 nodes · 7836 edges · 38 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 1782 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 586 edges
2. `POST()` - 507 edges
3. `cn()` - 223 edges
4. `useAuth()` - 208 edges
5. `Error()` - 140 edges
6. `DELETE()` - 137 edges
7. `slice()` - 110 edges
8. `PUT()` - 96 edges
9. `from()` - 88 edges
10. `includes()` - 88 edges

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
Cohesion: 0.0
Nodes (172): verifyAdminAccess(), verifyAuth(), verifyAuthWithRole(), verifyRoleAccess(), createAttendanceAuditLog(), buildRuleKey(), finalizeAttendance(), isWithinWindow() (+164 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (289): AcademicYearProvider(), AcademicYearSetupBannerProvider(), AlumniConversionDialog(), paginate(), AssignmentsTab(), AtlasAchievementDialog(), AttendanceTable(), useAuth() (+281 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (400): as(), generate(), #n(), Pa(), rs(), ICICIAdapter, updateSession(), _e() (+392 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (404): $(), #a(), aa(), ac(), Ad(), addErrorMessage(), addField(), addItem() (+396 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (214): AccordionContent(), AccordionItem(), AccordionTrigger(), AdminTodoWidget(), Alert(), AlertDescription(), AlertTitle(), AlertDialogAction() (+206 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (114): AxisAdapter, Calendar(), CalendarDayButton(), Du(), Error(), refreshGoogleToken(), HDFCAdapter, createISAPIClient() (+106 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (129): AttendanceReminderProvider(), generateSchoolSlug(), generateUniqueSlug(), main(), slugify(), main(), checkCapacity(), logCapacityExceeded() (+121 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (62): apiResponse(), errorResponse(), getPagination(), parseBody(), safeDbCall(), withTimeout(), checkBusStatus(), getDistanceMeters() (+54 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (42): getBulkJob(), getJobKey(), listBulkJobs(), setBulkJob(), updateBulkJob(), fromContent(), read(), getAccountCredentialsEmailTemplate() (+34 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (40): delCache(), generateKey(), getCache(), hasValue(), invalidatePattern(), invalidateSchoolMarketplaceCache(), remember(), setCache() (+32 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (14): DailyStatsCards(), fetchChartData(), fetchDailyStats(), PieTooltip(), checkDuplicate(), createDriver(), fetchConductors(), fetchDrivers() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (24): cm(), tl(), $(), a(), de(), F, fe(), G() (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (31): applyTextStyles(), createPdfBlobFromLayout(), downloadPdfFromLayout(), getImageFormat(), getPdfFormat(), renderBackground(), renderImage(), renderPdfFromLayout() (+23 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (2): FeaturesSection(), TestimonialsSection()

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (17): CommandMenu(), LibraryNotificationProvider(), useLibraryNotifications(), useLoader(), NavSidebarSections(), NavUser(), BookRequestsPage(), ImageUploader() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (16): ChatView(), ConversationItem(), ConversationSidebar(), formatTime(), MessageBubble(), NewChatModal(), PublicExamPage(), useConversations() (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (13): AtlasGalleryUploadDialog(), extractImagesFromZip(), getExtension(), isImageFile(), useBulkUpload(), BulkUploadDialog(), BulkUploadToast(), extractImagesFromZip() (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.1
Nodes (10): DocsPageClient(), DocsTableOfContents(), getIcon(), SearchModal(), VerificationPage(), extractHeadings(), slugify(), useDocBySlug() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (7): AiInsightsCard(), useAiInsights(), useDashboardContext(), useDashboardInsights(), getInitials(), useTypingEffect(), WelcomeBanner()

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (13): applyMappingsToTemplateElements(), buildCertificateMappingContext(), buildDocumentMappingContext(), buildExamScheduleText(), buildResolvedMappings(), buildResolvedTemplateConfig(), extractTemplatePlaceholders(), formatDate() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.27
Nodes (8): batchCalculateStreak(), calculateStreak(), generateClassWiseReport(), generateLeaveAnalysis(), generateMonthlyReport(), generateStudentWiseReport(), generateSummaryReport(), generateTeacherReport()

### Community 22 - "Community 22"
Cohesion: 0.36
Nodes (6): checkSaleLine(), fmt(), monthLabel(), PieTooltip(), SalesTab(), toNum()

### Community 23 - "Community 23"
Cohesion: 0.42
Nodes (8): downloadExcel(), exportClassWiseToExcel(), exportDefaultersToExcel(), exportLeaveAnalysisToExcel(), exportMonthlyToExcel(), exportStudentWiseToExcel(), exportSummaryToExcel(), exportTeacherToExcel()

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (4): ChartAreaInteractive(), DraggableRow(), TableCellViewer(), useIsMobile()

### Community 25 - "Community 25"
Cohesion: 0.28
Nodes (2): ApiLoaderState, load()

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (1): run()

### Community 27 - "Community 27"
Cohesion: 0.47
Nodes (4): DataField(), FilePreview(), getFileType(), SubmissionDetailPage()

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): DataLoader, MergedExtensionsList, RequestHandler, Skip, TypedSql

### Community 31 - "Community 31"
Cohesion: 0.4
Nodes (4): AnyNull, DbNull, JsonNull, PrismaClient

### Community 33 - "Community 33"
Cohesion: 0.7
Nodes (4): batchCalculateSchoolLateFees(), calculateLateFees(), computeLateFee(), resolveLateFeeRule()

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (1): PaymentAdapter

### Community 36 - "Community 36"
Cohesion: 0.83
Nodes (3): AttendanceSettings(), calculateDistance(), formatMeters()

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (2): countActiveFilters(), SchoolFilters()

### Community 44 - "Community 44"
Cohesion: 0.83
Nodes (3): buildContactAdminNotificationTemplate(), buildContactThankYouTemplate(), escapeHtml()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (2): getQueryKeysForRoute(), hasPrefetchConfig()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (1): AboutPage()

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (1): PrismaClient

## Knowledge Gaps
- **9 isolated node(s):** `PrismaClient`, `DbNull`, `JsonNull`, `AnyNull`, `DataLoader` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (33 nodes): `AboutBriefSection()`, `AppGlimpseSection()`, `AppShowcaseSection()`, `AttendanceSection()`, `BenefitsSection()`, `BentoSection()`, `BusTrackingSection()`, `CommissionSection()`, `CommunicatingSeamlesslySection()`, `FAQSection()`, `FeatureBadge()`, `FeaturesSection()`, `FinalCTASection()`, `Footer()`, `HeroSection()`, `HomePage()`, `HowItWorksSection()`, `HPCSection()`, `IntegrationsSection()`, `MacbookMockupSection()`, `MarqueeBanner()`, `PartnersPage()`, `PartnerTeaser()`, `PartnerTypesSection()`, `PricingSection()`, `RoleBadge()`, `SchoolExplorerSection()`, `StatsSection()`, `TestimonialsSection()`, `TrustedSection()`, `WhyPartnerSection()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (9 nodes): `ApiLoaderState`, `.notify()`, `.start()`, `.stop()`, `.subscribe()`, `TopProgressBar.js`, `api-loader.js`, `load()`, `stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (7 nodes): `dedupeClassScopedTables()`, `dedupeSectionScopedTables()`, `cleanup-duplicate-classes.js`, `normalizeName()`, `run()`, `updateForeignKey()`, `updateSectionForeignKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (5 nodes): `PaymentAdapter`, `.constructor()`, `.initiatePayment()`, `.verifyPayment()`, `PaymentAdapter.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (4 nodes): `countActiveFilters()`, `formatSliderValue()`, `SchoolFilters()`, `SchoolFilters.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `createPrefetchConfig()`, `getQueryKeysForRoute()`, `hasPrefetchConfig()`, `route-prefetch-map.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `RootLayout()`, `layout.js`, `layout.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (3 nodes): `AboutPage()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (3 nodes): `PrismaClient`, `.constructor()`, `index-browser.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 33`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 20`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 19`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 4` to `Community 16`, `Community 1`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Are the 64 inferred relationships involving `GET()` (e.g. with `verifyAdminAccess()` and `Error()`) actually correct?**
  _`GET()` has 64 INFERRED edges - model-reasoned connections that need verification._
- **Are the 153 inferred relationships involving `POST()` (e.g. with `includes()` and `update()`) actually correct?**
  _`POST()` has 153 INFERRED edges - model-reasoned connections that need verification._
- **Are the 222 inferred relationships involving `cn()` (e.g. with `CropImageDialog()` and `SchoolCalendar()`) actually correct?**
  _`cn()` has 222 INFERRED edges - model-reasoned connections that need verification._
- **Are the 207 inferred relationships involving `useAuth()` (e.g. with `AssignmentsTab()` and `SignaturesTab()`) actually correct?**
  _`useAuth()` has 207 INFERRED edges - model-reasoned connections that need verification._