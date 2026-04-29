# Graph Report - edutemp  (2026-04-29)

## Corpus Check
- 1314 files · ~3,048,174 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4109 nodes · 6987 edges · 35 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 1821 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `POST()` - 218 edges
3. `useAuth()` - 208 edges
4. `GET()` - 176 edges
5. `Error()` - 140 edges
6. `slice()` - 110 edges
7. `includes()` - 89 edges
8. `from()` - 88 edges
9. `toString()` - 79 edges
10. `get()` - 77 edges

## Surprising Connections (you probably didn't know these)
- `getHealthMetrics()` --calls--> `GET()`  [INFERRED]
  src\middleware.js → src\app\dashboard\schools\[schoolId]\students\route.js
- `Error()` --calls--> `sitemap()`  [INFERRED]
  src\app\error.jsx → src\app\sitemap.js
- `Error()` --calls--> `markAttendance()`  [INFERRED]
  src\app\error.jsx → src\components\profile.jsx
- `Error()` --calls--> `logCapacityExceeded()`  [INFERRED]
  src\app\error.jsx → src\lib\subscription\capacityHelper.js
- `FeaturesSection()` --calls--> `from()`  [INFERRED]
  src\app\page.jsx → src\app\generated\prisma\runtime\wasm-compiler-edge.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (404): #a(), aa(), ac(), Ad(), addErrorMessage(), addField(), addItem(), addMarginSymbol() (+396 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (385): as(), generate(), handleAndLogRequestError(), Pa(), rs(), updateSession(), de(), _e() (+377 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (182): AcademicYearProvider(), AcademicYearSetupBannerProvider(), paginate(), AssignmentsTab(), useAuth(), BreadcrumbHeader(), CommandMenu(), useFeeAssignJob() (+174 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (183): getSchoolIdFromRequest(), resolveSchoolIdByLookup(), verifyAdminAccess(), verifyAuth(), verifyAuthWithRole(), verifyRoleAccess(), withSchoolAccess(), apiResponse() (+175 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (195): AccordionContent(), AccordionItem(), AccordionTrigger(), AdminTodoWidget(), Alert(), AlertDescription(), AlertTitle(), AlertDialogAction() (+187 more)

### Community 5 - "Community 5"
Cohesion: 0.01
Nodes (147): AlumniConversionDialog(), SidebarSkeleton(), AtlasAchievementDialog(), AttendanceTable(), BuilderSection(), ChartAreaInteractive(), run(), DraggableRow() (+139 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (130): AutoStatuspageSync, createJobId(), getBulkJob(), getJobKey(), listBulkJobs(), setBulkJob(), updateBulkJob(), applyMappingsToTemplateElements() (+122 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (82): AtlasGalleryUploadDialog(), extractImagesFromZip(), getExtension(), isImageFile(), AttendanceReminderProvider(), generateSchoolSlug(), generateUniqueSlug(), main() (+74 more)

### Community 8 - "Community 8"
Cohesion: 0.02
Nodes (47): DailyStatsCards(), fetchChartData(), fetchDailyStats(), PieTooltip(), downloadExcel(), exportClassWiseToExcel(), exportDefaultersToExcel(), exportLeaveAnalysisToExcel() (+39 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (70): buildRuleKey(), finalizeAttendance(), isWithinWindow(), processAttendanceLifecycleWorker(), queueNotification(), sendGroupedNotifications(), calculateOvertimeHours(), calculateWorkingHours() (+62 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (43): AxisAdapter, checkBusStatus(), getDistanceMeters(), isOperatingHours(), calculateCost(), estimateTokens(), generateInsights(), generatePromptHash() (+35 more)

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (37): Fn(), LoginPhoto(), getHealthMetrics(), middleware(), trackMetric(), BulkImageUploadPage(), DeveloperLoginContent(), FailureContent() (+29 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (30): createAttendanceAuditLog(), fromContent(), read(), getAccountCredentialsEmailTemplate(), sendBulkEmails(), sendEmail(), sendWithNodemailer(), sendWithResend() (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (22): cm(), tl(), $(), a(), F, fe(), G(), ge() (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (13): ApplicationDetails(), ComparePageContent(), FormListPage(), LocationInput(), NewProfilePage(), SchoolSearchModal(), useDebounce(), useThrottle() (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (15): checkCapacity(), logCapacityExceeded(), $(), DocsPageClient(), DocsTableOfContents(), getIcon(), SearchModal(), PayDashboardPage() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (2): FeaturesSection(), TestimonialsSection()

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (23): applyTextStyles(), createPdfBlobFromLayout(), downloadPdfFromLayout(), getImageFormat(), getPdfFormat(), renderBackground(), renderImage(), renderPdfFromLayout() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (17): ChatView(), ConversationItem(), ConversationSidebar(), formatTime(), MessageBubble(), NewChatModal(), PublicExamPage(), SelfAttendancePage() (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (7): AiInsightsCard(), useAiInsights(), useDashboardContext(), useDashboardInsights(), getInitials(), useTypingEffect(), WelcomeBanner()

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (2): ApiLoaderState, load()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): DataLoader, MergedExtensionsList, RequestHandler, Skip, TypedSql

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (4): AnyNull, DbNull, JsonNull, PrismaClient

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (1): PaymentAdapter

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (1): safeJSON()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (1): normalizeSignaturePayload()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (1): normalizeProfile()

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): getDayName()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (2): countActiveFilters(), SchoolFilters()

### Community 40 - "Community 40"
Cohesion: 0.83
Nodes (3): buildContactAdminNotificationTemplate(), buildContactThankYouTemplate(), escapeHtml()

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (2): getQueryKeysForRoute(), hasPrefetchConfig()

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (1): AboutPage()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (1): normalizeParam()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (1): PrismaClient

## Knowledge Gaps
- **9 isolated node(s):** `PrismaClient`, `DbNull`, `JsonNull`, `AnyNull`, `DataLoader` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (33 nodes): `AboutBriefSection()`, `AppGlimpseSection()`, `AppShowcaseSection()`, `AttendanceSection()`, `BenefitsSection()`, `BentoSection()`, `BusTrackingSection()`, `CommissionSection()`, `CommunicatingSeamlesslySection()`, `FAQSection()`, `FeatureBadge()`, `FeaturesSection()`, `FinalCTASection()`, `Footer()`, `HeroSection()`, `HomePage()`, `HowItWorksSection()`, `HPCSection()`, `IntegrationsSection()`, `MacbookMockupSection()`, `MarqueeBanner()`, `PartnersPage()`, `PartnerTeaser()`, `PartnerTypesSection()`, `PricingSection()`, `RoleBadge()`, `SchoolExplorerSection()`, `StatsSection()`, `TestimonialsSection()`, `TrustedSection()`, `WhyPartnerSection()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (9 nodes): `ApiLoaderState`, `.notify()`, `.start()`, `.stop()`, `.subscribe()`, `TopProgressBar.js`, `api-loader.js`, `load()`, `stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (5 nodes): `PaymentAdapter`, `.constructor()`, `.initiatePayment()`, `.verifyPayment()`, `PaymentAdapter.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `safeJSON()`, `route.js`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `normalizeSignaturePayload()`, `parseOptionalInt()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `findProfile()`, `normalizeProfile()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `addDays()`, `getDayName()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (4 nodes): `countActiveFilters()`, `formatSliderValue()`, `SchoolFilters()`, `SchoolFilters.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (4 nodes): `createPrefetchConfig()`, `getQueryKeysForRoute()`, `hasPrefetchConfig()`, `route-prefetch-map.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (3 nodes): `RootLayout()`, `layout.js`, `layout.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `AboutPage()`, `page.jsx`, `page.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `normalizeParam()`, `route.js`, `route.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `PrismaClient`, `.constructor()`, `index-browser.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 4` to `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 14`, `Community 18`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 2` to `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 11`, `Community 14`, `Community 17`, `Community 18`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `from()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 222 inferred relationships involving `cn()` (e.g. with `CropImageDialog()` and `SchoolCalendar()`) actually correct?**
  _`cn()` has 222 INFERRED edges - model-reasoned connections that need verification._
- **Are the 158 inferred relationships involving `POST()` (e.g. with `includes()` and `update()`) actually correct?**
  _`POST()` has 158 INFERRED edges - model-reasoned connections that need verification._
- **Are the 207 inferred relationships involving `useAuth()` (e.g. with `AssignmentsTab()` and `SignaturesTab()`) actually correct?**
  _`useAuth()` has 207 INFERRED edges - model-reasoned connections that need verification._
- **Are the 67 inferred relationships involving `GET()` (e.g. with `verifyAdminAccess()` and `Error()`) actually correct?**
  _`GET()` has 67 INFERRED edges - model-reasoned connections that need verification._