export type TalentPilotRole =
  | 'SystemAdmin'
  | 'TenantAdmin'
  | 'Presales'
  | 'PMO'
  | 'Recruiter'
  | 'HiringManager'
  | 'HOD'
  | 'Interviewer'
  | 'Employee'
  | 'Candidate';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type AssignmentStatus = 'Pending' | 'Claimed' | 'Completed';
export type JobRequestStage =
  | 'Draft'
  | 'PMO Review'
  | 'Presales Review'
  | 'Recruiter Sourcing'
  | 'Interviewing'
  | 'Hiring Manager Review'
  | 'Offer Outcome'
  | 'Closed';

export interface CurrentUser {
  id: string;
  userId?: string;
  tenantId?: string;
  tenantDisplayName?: string;
  name: string;
  displayName?: string;
  email: string;
  roleDisplayName?: string;
  roles: TalentPilotRole[];
  permissions?: string[];
  groups: string[];
  groupDetails?: CurrentUserGroup[];
  routes?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: BackendCurrentUserContext;
}

export interface BackendCurrentUserContext {
  userId: string;
  tenantId: string;
  tenantDisplayName: string;
  displayName: string;
  email: string;
  roleDisplayName: string;
  roles: BackendCurrentUserRole[];
  permissions: string[];
  groups: CurrentUserGroup[];
  routes: string[];
}

export interface BackendCurrentUserRole {
  roleId: string;
  code: string;
  displayName: string;
  priority: number;
}

export interface LoginOption {
  userId: string;
  displayName: string;
  email: string;
  roleDisplayName: string;
  roles: BackendCurrentUserRole[];
  groups: CurrentUserGroup[];
}

export interface CandidateSignupRequest {
  tenantSlug?: string | null;
  jobPostId?: string | null;
  displayName: string;
  email: string;
  password: string;
}

export interface CurrentUserGroup {
  groupId: string;
  name: string;
  purpose: string;
}

export type RagAssistantContextType = 'RecruiterCandidateFit' | 'PmoRequest' | 'HiringDecisionBrief';

export interface RagChatRequest {
  contextType: RagAssistantContextType;
  contextEntityId: string;
  focusEntityId?: string | null;
  conversationId?: string | null;
  message: string;
}

export interface RagChatResponse {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  answer: string;
  citations: RagCitation[];
  model: string;
  agentRunId: string;
  promptVersion: string;
  generatedAtUtc: string;
}

export interface RagCitation {
  citationId: string;
  knowledgeChunkId: string;
  label: string;
  sourceTitle: string;
  sourceType: string;
  sourceEntityId: string;
  sourceRoute?: string | null;
  score: number;
  excerpt: string;
}

export interface RagConversation {
  conversationId: string;
  contextType: RagAssistantContextType;
  contextEntityId: string;
  focusEntityId?: string | null;
  title: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  messages: RagMessage[];
}

export interface RagMessage {
  messageId: string;
  role: 'User' | 'Assistant' | 'System';
  content: string;
  model?: string | null;
  agentRunId?: string | null;
  promptVersion?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAtUtc: string;
  citations: RagCitation[];
}

export interface RagFeedbackRequest {
  rating: 'Helpful' | 'NotHelpful';
  notes?: string | null;
}

export interface OperationsPerson {
  userId: string;
  displayName: string;
  email: string;
  roleCodes: string[];
  roleNames: string[];
}

export interface OperationsSnapshot {
  people: OperationsPerson[];
  jobRequests: JobRequest[];
  assignments: WorkflowAssignment[];
  notifications: Notification[];
}

export interface TenantAdminDashboardQuery {
  fromUtc?: string;
  toUtc?: string;
  departmentId?: string;
  sourceLabel?: string;
  recruiterUserId?: string;
}

export interface TenantAdminDashboard {
  generatedAtUtc: string;
  fromUtc: string;
  toUtc: string;
  filters: TenantAdminDashboardFilterOptions;
  summary: TenantAdminDashboardSummary;
  hiringFunnel: TenantAdminDashboardFunnelItem[];
  adminAttention: TenantAdminDashboardAttentionItem[];
  offerHealth: TenantAdminDashboardOfferHealth;
  candidatePipeline: TenantAdminDashboardPipelineItem[];
  operationalEfficiency: TenantAdminDashboardEfficiency;
  stageAging: TenantAdminDashboardStageAgingItem[];
  departmentPerformance: TenantAdminDashboardDepartmentPerformanceItem[];
  skillsDemand: TenantAdminDashboardSkillDemandItem[];
  sourceQuality: TenantAdminDashboardSourceQualityItem[];
  interviewOperations: TenantAdminDashboardInterviewOperations;
  aiHealth: TenantAdminDashboardAiHealth;
}

export interface TenantAdminDashboardFilterOptions {
  departments: LookupOption[];
  sourceLabels: LookupOption[];
  recruiters: LookupOption[];
}

export interface TenantAdminDashboardSummary {
  openJobRequests: number;
  openPositions: number;
  requiredPositions: number;
  fulfilledPositions: number;
  publishedJobPosts: number;
  activeApplications: number;
  interviewsThisWeek: number;
  offers: number;
  joinedCandidates: number;
}

export interface TenantAdminDashboardFunnelItem {
  label: string;
  count: number;
  conversionRate: number | null;
}

export interface TenantAdminDashboardAttentionItem {
  severity: string;
  title: string;
  detail: string;
  count: number;
  route: string;
}

export interface TenantAdminDashboardOfferHealth {
  offerLetters: number;
  presentationMeetings: number;
  offered: number;
  onHold: number;
  rejected: number;
  joined: number;
  openPositionsRemaining: number;
}

export interface TenantAdminDashboardPipelineItem {
  status: string;
  count: number;
}

export interface TenantAdminDashboardEfficiency {
  averageTimeToFillDays: number | null;
  medianDaysOpen: number | null;
  oldestOpenRequestDays: number;
  pmoQueueLoad: number;
  recruiterSourcingLoad: number;
  interviewerLoad: number;
  hiringManagerPendingReviews: number;
}

export interface TenantAdminDashboardStageAgingItem {
  jobRequestId: string;
  requestCode: string;
  title: string;
  department: string;
  currentStage: string;
  ownerName: string;
  daysInStage: number;
  risk: string;
}

export interface TenantAdminDashboardDepartmentPerformanceItem {
  department: string;
  openRequests: number;
  openPositions: number;
  applications: number;
  interviews: number;
  joined: number;
  averageTimeToFillDays: number | null;
}

export interface TenantAdminDashboardSkillDemandItem {
  skill: string;
  demandCount: number;
  candidateCount: number;
  gap: number;
}

export interface TenantAdminDashboardSourceQualityItem {
  sourceLabel: string;
  applications: number;
  interviewPassRate: number;
  offers: number;
  joined: number;
  rejectionWithdrawalRate: number;
}

export interface TenantAdminDashboardInterviewOperations {
  scheduled: number;
  completed: number;
  skipped: number;
  noShow: number;
  pendingFeedback: number;
  overdueFeedback: number;
}

export interface TenantAdminDashboardAiHealth {
  runsToday: number;
  failedRuns: number;
  latestBenchMatchingAt?: string | null;
  latestTalentRediscoveryAt?: string | null;
  activeEmbeddings: number;
  candidateEmbeddings: number;
  jobRequestEmbeddings: number;
  jobPostEmbeddings: number;
  employeeEmbeddings: number;
}

export interface PmoDashboardQuery {
  fromUtc?: string;
  toUtc?: string;
  departmentId?: string;
}

export interface PmoDashboard {
  generatedAtUtc: string;
  fromUtc: string;
  toUtc: string;
  filters: PmoDashboardFilterOptions;
  summary: PmoDashboardSummary;
  workQueue: PmoDashboardWorkItem[];
  benchInsights: PmoDashboardBenchInsight[];
  recommendationOutcomes: PmoDashboardRecommendationOutcomes;
  agingBuckets: PmoDashboardAgingBucket[];
  departmentLoad: PmoDashboardDepartmentLoad[];
  decisionSplit: PmoDashboardDecisionSplit[];
  recommendationTrend: PmoDashboardRecommendationTrendItem[];
  skillDemandVsBench: PmoDashboardSkillBenchItem[];
  aiHealth: PmoDashboardAiHealth;
}

export interface PmoDashboardFilterOptions {
  departments: LookupOption[];
}

export interface PmoDashboardSummary {
  unclaimedReviews: number;
  myClaimedReviews: number;
  returnedFromPresales: number;
  aiRankedRequests: number;
  recommendedToPresales: number;
  forwardedToRecruiters: number;
}

export interface PmoDashboardWorkItem {
  jobRequestId: string;
  requestCode: string;
  title: string;
  client: string;
  department: string;
  location: string;
  priority: Priority | string;
  assignmentId: string;
  assignmentStatus: AssignmentStatus | string;
  ownerState: string;
  claimedByName?: string | null;
  assignedAtUtc: string;
  daysWaiting: number;
  latestAction: string;
  hasBenchMatches: boolean;
  topFitScore?: number | null;
  eligibleEmployeeCount: number;
  pendingReferralCount: number;
  cta: string;
}

export interface PmoDashboardBenchInsight {
  jobRequestId: string;
  requestCode: string;
  title: string;
  latestRankedAt?: string | null;
  topFitScore?: number | null;
  topEmployeeName?: string | null;
  eligibleEmployeeCount: number;
  locationFitCount: number;
  averageMatchedSkills: number;
  openSkillGaps: number;
  aiStatus: string;
}

export interface PmoDashboardRecommendationOutcomes {
  pendingPresalesReview: number;
  acceptedByPresales: number;
  rejectedByPresales: number;
  fulfilledInternally: number;
  presalesResponseRate: number;
}

export interface PmoDashboardAgingBucket {
  label: string;
  count: number;
}

export interface PmoDashboardDepartmentLoad {
  department: string;
  pendingReviews: number;
  claimedReviews: number;
  averageAgeDays: number;
}

export interface PmoDashboardDecisionSplit {
  decision: string;
  count: number;
}

export interface PmoDashboardRecommendationTrendItem {
  periodStartUtc: string;
  recommended: number;
  accepted: number;
  rejected: number;
}

export interface PmoDashboardSkillBenchItem {
  skill: string;
  demandCount: number;
  benchAvailableCount: number;
  gap: number;
}

export interface PmoDashboardAiHealth {
  runsInWindow: number;
  failedRuns: number;
  latestRunAt?: string | null;
  rankedRequests: number;
  employeeEmbeddings: number;
}

export interface HiringManagerDashboard {
  generatedAtUtc: string;
  summary: HiringManagerDashboardSummary;
  priorityReviews: HiringManagerDashboardReviewItem[];
  offerPipeline: HiringManagerDashboardStatusBreakdownItem[];
  agingBuckets: HiringManagerDashboardAgingBucket[];
  outcomeSplit: HiringManagerDashboardStatusBreakdownItem[];
  recentActivity: HiringManagerDashboardActivityItem[];
}

export interface HiringManagerDashboardSummary {
  pendingReviews: number;
  offerFollowUps: number;
  onHold: number;
  completedOutcomes: number;
  oldestWaitingDays: number;
}

export interface HiringManagerDashboardReviewItem {
  jobApplicationId: string;
  jobRequestId: string;
  jobPostId?: string | null;
  requestCode: string;
  jobTitle: string;
  client: string;
  department: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  hiringManagerName: string;
  updatedAt: string;
  daysWaiting: number;
  completedInterviews: number;
  averageScore?: number | null;
  positiveRecommendations: number;
  offerLetterStatus?: string | null;
  latestMeetingAt?: string | null;
}

export interface HiringManagerDashboardStatusBreakdownItem {
  status: string;
  count: number;
}

export interface HiringManagerDashboardAgingBucket {
  label: string;
  count: number;
}

export interface HiringManagerDashboardActivityItem {
  id: string;
  jobApplicationId: string;
  jobRequestId: string;
  requestCode: string;
  candidateName: string;
  actorName: string;
  title: string;
  detail: string;
  createdAt: string;
}

export interface JobRequestIntakeOptions {
  departments: IntakeDepartmentOption[];
  locations: LookupOption[];
  skills: LookupOption[];
  hiringManagers: LookupOption[];
}

export interface IntakeDepartmentOption {
  departmentId: string;
  code: string;
  name: string;
  routingPreview: RoutingPreview;
}

export interface RoutingPreview {
  assignmentType: 'User' | 'Group' | 'Fallback' | string;
  targetUserId?: string | null;
  targetGroupId?: string | null;
  targetName: string;
  usesTenantAdminFallback: boolean;
}

export interface LookupOption {
  id: string;
  name: string;
  description?: string | null;
}

export interface CreateJobRequestResult {
  jobRequest: JobRequest;
  assignment: WorkflowAssignment;
}

export interface JobRequest {
  id: string;
  code: string;
  title: string;
  client: string;
  clientContext?: string | null;
  description: string;
  department: string;
  skills: string[];
  experience: string;
  location: string;
  requiredPositions: number;
  fulfilledPositions: number;
  priority: Priority;
  hiringManagerId: string;
  createdById: string;
  stage: JobRequestStage;
  ownerId?: string;
  ownerGroupId?: string;
  publishStatus: 'NotPublished' | 'Published' | 'Closed';
  createdAt: string;
}

export interface CreateJobRequestInput {
  title: string;
  client: string;
  clientContext?: string | null;
  description: string;
  departmentId: string;
  locationId: string;
  skillIds: string[];
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  requiredPositions: number;
  priority: Priority;
  hiringManagerId: string;
}

export interface DraftJobDescriptionInput {
  title: string;
  client: string;
  clientContext?: string | null;
  departmentId: string;
  locationId: string;
  skillIds: string[];
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  requiredPositions: number;
  priority: Priority;
  hiringManagerId: string;
}

export interface DraftJobDescriptionResult {
  description: string;
  agentRunId: string;
  model: string;
  generatedAtUtc: string;
}

export interface PmoReview {
  jobRequest: JobRequest;
  assignment?: WorkflowAssignment | null;
  referrals: EmployeeReferral[];
  eligibleEmployees: BenchEmployee[];
  benchMatches: BenchMatch[];
  presalesUsers: LookupOption[];
  defaultPresalesUserId?: string | null;
  recruiterHandoffTargetName: string;
}

export interface RecruitmentQueue {
  items: RecruitmentQueueItem[];
}

export interface RecruitmentQueueItem {
  jobRequest: JobRequest;
  assignment: WorkflowAssignment;
  jobPostId?: string | null;
  jobPostStatus: JobPostStatus | 'NotStarted' | string;
  recruiterOwnerName?: string | null;
  jobPostUpdatedAt?: string | null;
}

export interface RecruiterSourcing {
  jobRequest: JobRequest;
  assignment?: WorkflowAssignment | null;
  jobPost?: JobPost | null;
  applications: RecruiterApplication[];
  candidateSearchItems: ManualCandidateSearchItem[];
  talentRediscoveryMatches: TalentRediscoveryMatch[];
  applicantRankings: ApplicantRankingMatch[];
  interviewTemplates: InterviewTemplateOption[];
  interviewers: InterviewerOption[];
  hodInterviewers: LookupOption[];
  skills: LookupOption[];
  onlineHeadhunting?: OnlineHeadhuntingResult | null;
  configuredAiModel?: string | null;
}

export interface OnlineHeadhuntingSearchInput {
  limit?: number | null;
  sourceCodes?: string[] | null;
  searchMoreFromRunId?: string | null;
}

export interface OnlineHeadhuntingQueuedResult {
  requestId: string;
  jobRequestId: string;
  requestedByUserId: string;
  status: string;
  message: string;
  requestedLimit: number;
  dailyLeadLimit: number;
  dailyLeadCountBeforeRun: number;
  sourceCodes: string[];
  queuedAtUtc: string;
}

export interface OnlineHeadhuntingResult {
  run: OnlineHeadhuntingRunSummary;
  leads: OnlineCandidateLead[];
}

export interface OnlineHeadhuntingRunSummary {
  onlineCandidateSourcingRunId: string;
  jobRequestId: string;
  jobPostId?: string | null;
  aiAgentRunId?: string | null;
  searchMoreFromRunId?: string | null;
  requestedLimit: number;
  dailyLeadLimit: number;
  dailyLeadCountBeforeRun: number;
  leadsReturned: number;
  searchStatus: string;
  model: string;
  sourceCodes: string[];
  queries: string[];
  createdAtUtc: string;
}

export interface OnlineCandidateLead {
  onlineCandidateLeadId: string;
  onlineCandidateSourcingRunId: string;
  jobRequestId: string;
  rank: number;
  sourceCode: string;
  sourceDisplayName: string;
  sourceUrl: string;
  displayName?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  locationText?: string | null;
  email?: string | null;
  phone?: string | null;
  profileUrl?: string | null;
  evidenceSnippet: string;
  matchScore: number;
  confidence: string;
  fitSummary: string;
  strengths: string[];
  matchedSkills: string[];
  gaps: string[];
  missingData: string[];
  duplicateStatus: string;
  duplicateCandidateId?: string | null;
  duplicateCandidateName?: string | null;
  duplicateExplanation?: string | null;
  outreachDraft: string;
  status: string;
  createdAtUtc: string;
}

export interface RecruiterApplication {
  jobApplicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateStatus: string;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  noticePeriodDays?: number | null;
  applicationStatus: string;
  sourceLabel: string;
  sourceDetail?: string | null;
  sourceUrl?: string | null;
  coverLetterText?: string | null;
  isInvited: boolean;
  appliedAt: string;
  interviewsPassed: number;
  interviewsTotal: number;
  interviewPassSummary: string;
  documents: RecruiterApplicationDocument[];
  interviews: RecruiterApplicationInterview[];
}

export interface RecruiterApplicationDocument {
  applicationDocumentId: string;
  jobApplicationId: string;
  documentType: string;
  displayName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  extractionStatus: string;
  hasTextEvidence: boolean;
}

export interface RecruiterApplicationInterview {
  interviewId: string;
  jobPostInterviewRoundId?: string | null;
  roundName: string;
  interviewerName: string;
  interviewerUserId: string;
  interviewerAccountStatus: string;
  interviewerIsDeleted: boolean;
  status: string;
  startsAt: string;
  durationMinutes: number;
  meetingLink?: string | null;
  locationText?: string | null;
  recommendation?: string | null;
}

export interface ManualCandidateSearchItem {
  candidateId: string;
  displayName: string;
  email: string;
  status: string;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  noticePeriodDays?: number | null;
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  applicationCount: number;
  passedInterviews: number;
  failedInterviews: number;
  totalInterviews: number;
  latestApplication?: CandidateApplicationEvidence | null;
}

export interface JobPublishing {
  items: JobPostListItem[];
}

export interface JobPostListItem {
  jobPostId: string;
  jobRequestId: string;
  requestCode: string;
  title: string;
  client: string;
  department: string;
  location: string;
  status: JobPostStatus;
  applicantCount: number;
  recruiterOwnerName: string;
  publishedAt?: string | null;
  closedAt?: string | null;
  updatedAt: string;
}

export type JobPostStatus = 'Draft' | 'Published' | 'Closed';

export interface JobPost {
  jobPostId: string;
  jobRequestId: string;
  title: string;
  description: string;
  department: string;
  location: string;
  experienceMinYears?: number | null;
  experienceMaxYears?: number | null;
  requiredPositions: number;
  status: JobPostStatus;
  recruiterOwnerUserId: string;
  recruiterOwnerName: string;
  publishedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  skills: JobPostSkill[];
  interviewRounds: JobPostInterviewRound[];
}

export interface PortalJobPostList {
  items: PortalJobPostListItem[];
}

export interface PublicPortalContext {
  tenantId: string;
  slug: string;
  displayName: string;
  careerDisplayName: string;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyCountry?: string | null;
  officialEmail?: string | null;
  officialPhone?: string | null;
  primaryColor: string;
  candidateLoginRequired: boolean;
  candidateCvFormat: string;
  publicJobsEnabled: boolean;
  inviteExpiryDays: number;
  reapplyCooldownDays: number;
  logoFileName?: string | null;
  logoContentType?: string | null;
  logoContentBase64?: string | null;
}

export interface PortalJobPostListItem {
  jobPostId: string;
  jobRequestId: string;
  requestCode: string;
  title: string;
  companyName: string;
  client: string;
  department: string;
  location: string;
  experienceMinYears?: number | null;
  experienceMaxYears?: number | null;
  requiredPositions: number;
  status: string;
  publishedAt: string;
  skills: JobPostSkill[];
}

export interface PortalJobPostDetail {
  jobPostId: string;
  jobRequestId: string;
  requestCode: string;
  title: string;
  description: string;
  companyName: string;
  client: string;
  department: string;
  location: string;
  experienceMinYears?: number | null;
  experienceMaxYears?: number | null;
  requiredPositions: number;
  status: string;
  publishedAt: string;
  skills: JobPostSkill[];
}

export interface PortalInvitationContext {
  candidateInvitationId: string;
  jobPostId: string;
  jobTitle: string;
  companyName: string;
  status: string;
  expiresAtUtc: string;
  usedAtUtc?: string | null;
  isExpired: boolean;
  isRevoked: boolean;
}

export interface PortalApplyToJobPostInput {
  phone?: string | null;
  linkedInUrl?: string | null;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  noticePeriodDays?: number | null;
  interviewAvailabilityStartDate?: string | null;
  interviewAvailabilityEndDate?: string | null;
  universityName?: string | null;
  degreeName?: string | null;
  graduationYear?: number | null;
  coverLetter?: string | null;
  candidateInvitationId?: string | null;
  invitationToken?: string | null;
}

export interface PortalJobApplicationResult {
  jobApplicationId: string;
  jobPostId: string;
  jobRequestId: string;
  status: string;
  alreadyApplied: boolean;
}

export interface PortalMyApplications {
  items: PortalMyApplicationItem[];
}

export interface PortalCandidateProfile {
  candidateId?: string | null;
  displayName: string;
  email: string;
  emailVerifiedAt?: string | null;
  emailVerifiedAtUtc?: string | null;
  isEmailVerified?: boolean | null;
  phone?: string | null;
  linkedInUrl?: string | null;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  expectedSalaryAmount?: number | null;
  expectedSalaryCurrency?: string | null;
  noticePeriodDays?: number | null;
  primaryEducation?: PortalCandidateProfileEducation | null;
  currentWorkHistory?: PortalCandidateProfileWorkHistory | null;
  skills: PortalCandidateProfileSkill[];
  skillOptions: PortalCandidateProfileSkillOption[];
  resumeDocument?: PortalCandidateProfileDocument | null;
}

export interface PortalCandidateProfileDocument {
  candidateProfileDocumentId: string;
  candidateId: string;
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageProvider: string;
  uploadedAt: string;
  extractionStatus: string;
  hasTextEvidence: boolean;
  parserVersion?: string | null;
  extractedAt?: string | null;
  extractionError?: string | null;
}

export interface PortalCandidateProfileEducation {
  universityName?: string | null;
  degreeName?: string | null;
  graduationYear?: number | null;
}

export interface PortalCandidateProfileWorkHistory {
  companyName?: string | null;
  title?: string | null;
}

export interface PortalCandidateProfileSkill {
  skillId: string;
  skillName: string;
  skillLevel: string;
  yearsExperience?: number | null;
  isPrimary: boolean;
}

export interface PortalCandidateProfileSkillOption {
  skillId: string;
  skillName: string;
  category?: string | null;
}

export interface UpdatePortalCandidateProfileInput {
  displayName: string;
  phone?: string | null;
  linkedInUrl?: string | null;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  expectedSalaryAmount?: number | null;
  expectedSalaryCurrency?: string | null;
  noticePeriodDays?: number | null;
  primaryEducation?: PortalCandidateProfileEducation | null;
  currentWorkHistory?: PortalCandidateProfileWorkHistory | null;
  skills?: UpdatePortalCandidateProfileSkillInput[] | null;
}

export interface UpdatePortalCandidateProfileSkillInput {
  skillId: string;
  skillLevel?: string | null;
  yearsExperience?: number | null;
  isPrimary: boolean;
}

export interface PortalMyApplicationItem {
  jobApplicationId: string;
  jobPostId: string;
  jobRequestId: string;
  requestCode: string;
  jobTitle: string;
  companyName: string;
  client: string;
  department: string;
  location: string;
  status: string;
  sourceLabel: string;
  appliedAt: string;
  finalDecisionAt?: string | null;
  finalDecisionReason?: string | null;
  offerStartDate?: string | null;
  interviewsPassed: number;
  interviewsTotal: number;
  interviewPassSummary: string;
  timeline?: PortalApplicationTimelineItem[];
  documents?: PortalApplicationDocument[];
}

export interface PortalApplicationDocument {
  applicationDocumentId: string;
  jobApplicationId: string;
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageProvider: string;
  uploadedAt: string;
  extractionStatus: string;
  hasTextEvidence: boolean;
  parserVersion?: string | null;
  extractedAt?: string | null;
  extractionError?: string | null;
}

export interface PortalUploadApplicationDocumentResult {
  document: PortalApplicationDocument;
}

export interface PortalUploadCandidateProfileDocumentResult {
  document: PortalCandidateProfileDocument;
}

export interface PortalApplicationTimelineItem {
  kind: string;
  title: string;
  description: string;
  occurredAt: string;
  status: string;
}

export interface AddManualCandidateInput {
  existingCandidateId?: string | null;
  displayName?: string | null;
  email: string;
  phone?: string | null;
  linkedInUrl?: string | null;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  noticePeriodDays?: number | null;
  skillIds?: string[] | null;
  sourceLabel: string;
  sourceDetail?: string | null;
  sourceUrl?: string | null;
  recruiterNotes?: string | null;
  universityName?: string | null;
  degreeName?: string | null;
  graduationYear?: number | null;
  invitationMessage?: string | null;
  parsedCvEvidence?: ParsedCandidateCvEvidenceInput | null;
  onlineLeadId?: string | null;
}

export interface ParsedCandidateCvEvidenceInput {
  fileName: string;
  contentType?: string | null;
  sizeBytes: number;
  contentHashSha256: string;
  extractedText: string;
  summary?: string | null;
  agentRunId?: string | null;
  model?: string | null;
  parsedAtUtc?: string | null;
}

export interface AddManualCandidateResult {
  candidateId: string;
  jobApplicationId: string;
  jobPostId: string;
  status: string;
  existingCandidate: boolean;
  existingApplication: boolean;
  invitationQueued: boolean;
}

export interface ParseCandidateCvResult {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  contentHashSha256: string;
  agentRunId: string;
  model: string;
  generatedAtUtc: string;
  extractedText: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  skills: string[];
  universityName?: string | null;
  degreeName?: string | null;
  graduationYear?: number | null;
  summary: string;
}

export interface UpdateCandidateApplicationStatusInput {
  decision: 'Shortlist' | 'Hold' | 'Reject' | string;
  notes?: string | null;
}

export interface ScheduleCandidateInterviewInput {
  jobPostInterviewRoundId: string;
  interviewerUserId?: string | null;
  startsAtUtc: string;
  meetingLink?: string | null;
  locationText?: string | null;
}

export interface ScheduleCandidateInterviewResult {
  interviewId: string;
  jobApplicationId: string;
  jobPostInterviewRoundId: string;
  interviewerUserId: string;
  interviewerName: string;
  roundName: string;
  startsAtUtc: string;
  durationMinutes: number;
  status: string;
}

export interface InterviewTaskList {
  items: InterviewTask[];
}

export interface InterviewTask {
  interviewId: string;
  jobApplicationId: string;
  jobPostInterviewRoundId: string;
  jobRequestId: string;
  jobPostId: string;
  requestCode: string;
  jobTitle: string;
  client: string;
  candidateName: string;
  candidateEmail: string;
  roundName: string;
  interviewerName: string;
  interviewerUserId: string;
  interviewerAccountStatus: string;
  interviewerIsDeleted: boolean;
  scheduledByName: string;
  startsAt: string;
  durationMinutes: number;
  meetingLink?: string | null;
  locationText?: string | null;
  status: string;
  recommendation?: string | null;
  technicalScore?: number | null;
  communicationScore?: number | null;
  cultureScore?: number | null;
  feedbackText?: string | null;
  submittedAt?: string | null;
}

export interface SubmitInterviewFeedbackInput {
  technicalScore: number;
  communicationScore: number;
  cultureScore: number;
  recommendation: 'Proceed' | 'Hold' | 'Reject' | string;
  feedbackText: string;
}

export interface SubmitInterviewFeedbackResult {
  interviewId: string;
  jobApplicationId: string;
  status: string;
  recommendation: string;
  submittedAt: string;
}

export interface GenerateInterviewQuestionRecommendationsInput {
  regenerateReason?: string | null;
}

export interface InterviewQuestionRecommendationSet {
  recommendationSetId: string;
  interviewId: string;
  jobApplicationId: string;
  jobPostInterviewRoundId: string;
  agentRunId: string;
  model: string;
  promptVersion: string;
  versionNumber: number;
  summary: string;
  rationale?: string | null;
  regenerateReason?: string | null;
  coverage: InterviewQuestionCoverage;
  status: string;
  generatedAtUtc: string;
  questions: InterviewQuestionRecommendation[];
}

export interface InterviewQuestionCoverage {
  roundType: string;
  targetQuestionCount: number;
  bankItemsUsed: number;
  semanticSimilarityStatus: string;
  skillsCovered: string[];
  candidateEvidenceUsed: string[];
}

export interface InterviewQuestionRecommendation {
  questionRecommendationId: string;
  sortOrder: number;
  questionText: string;
  questionType: string;
  roundType: string;
  skillName?: string | null;
  difficulty: string;
  rationale: string;
  expectedSignal: string;
  followUps: string[];
  evaluationRubric: string[];
  sourceBankItemId?: string | null;
}

export interface ForwardToHiringManagerResult {
  jobApplicationId: string;
  jobRequestId: string;
  hiringManagerUserId: string;
  status: string;
}

export interface HiringManagerReviewList {
  items: HiringManagerReviewListItem[];
}

export interface HiringManagerReviewListItem {
  jobApplicationId: string;
  jobRequestId: string;
  jobPostId?: string | null;
  requestCode: string;
  jobTitle: string;
  client: string;
  department: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  hiringManagerName: string;
  updatedAt: string;
  offerLetterStatus?: string | null;
  latestMeetingAt?: string | null;
}

export interface HiringReviewCandidateSummary {
  candidateId: string;
  displayName: string;
  email: string;
  status: string;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  expectedSalaryAmount?: number | null;
  expectedSalaryCurrency?: string | null;
  noticePeriodDays?: number | null;
}

export interface HiringReviewJobSummary {
  jobRequestId: string;
  jobPostId?: string | null;
  requestCode: string;
  jobTitle: string;
  client: string;
  department: string;
  location: string;
  experienceMinYears?: number | null;
  experienceMaxYears?: number | null;
  requiredPositions: number;
  fulfilledPositions: number;
  requestStatus: string;
  requestClosedAt?: string | null;
  requestCloseReason?: string | null;
  applicationStatus: string;
  finalOutcomeRecordedAt?: string | null;
  finalOutcomeReason?: string | null;
  sourceLabel: string;
  sourceDetail?: string | null;
  recruiterNotes?: string | null;
  requestDescription?: string | null;
  jobPostDescription?: string | null;
}

export interface HiringReviewInterviewDetail {
  interviewId: string;
  jobPostInterviewRoundId?: string | null;
  roundName: string;
  status: string;
  interviewerName: string;
  startsAt: string;
  durationMinutes: number;
  recommendation?: string | null;
  technicalScore?: number | null;
  communicationScore?: number | null;
  cultureScore?: number | null;
  averageScore?: number | null;
  feedbackText?: string | null;
  skipReason?: string | null;
  submittedAt?: string | null;
}

export interface OfferLetterDetails {
  offerLetterId: string;
  jobApplicationId: string;
  jobRequestId: string;
  jobPostId?: string | null;
  candidateId: string;
  generatedByUserId: string;
  generatedByName: string;
  version: number;
  status: string;
  compensationText?: string | null;
  startDate?: string | null;
  reportingManager?: string | null;
  workLocation?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferPresentationMeetingDetails {
  offerPresentationMeetingId: string;
  offerLetterId: string;
  jobApplicationId: string;
  meetingAt: string;
  locationText: string;
  notes?: string | null;
  status: string;
  createdAt: string;
}

export interface ReportingManagerOption {
  employeeId: string;
  displayName: string;
  email: string;
  designation?: string | null;
  department: string;
  location: string;
  experienceYears?: number | null;
  isDepartmentMatch: boolean;
}

export interface ReportingManagerOptionList {
  items: ReportingManagerOption[];
  totalCount: number;
  hasMore: boolean;
}

export interface HiringReviewDecisionMetric {
  key: string;
  label: string;
  value: string;
  score?: number | null;
  unit?: string | null;
  tone: string;
  icon: string;
  detail?: string | null;
}

export interface HiringReviewDecisionContextItem {
  key: string;
  label: string;
  value: string;
  icon: string;
  tone: string;
}

export interface HiringReviewDecisionBriefInsight {
  agentKey: string;
  agentName: string;
  summary: string;
  metrics: HiringReviewDecisionMetric[];
  context: HiringReviewDecisionContextItem[];
  signals: string[];
}

export interface HiringReviewDetail {
  candidate: HiringReviewCandidateSummary;
  job: HiringReviewJobSummary;
  interviews: HiringReviewInterviewDetail[];
  decisionBrief: string;
  decisionBriefInsight?: HiringReviewDecisionBriefInsight | null;
  offerLetter?: OfferLetterDetails | null;
  presentationMeetings: OfferPresentationMeetingDetails[];
}

export interface GenerateOfferLetterInput {
  compensationText?: string | null;
  startDate?: string | null;
  reportingManager?: string | null;
  workLocation?: string | null;
  additionalNotes?: string | null;
}

export interface UpdateOfferLetterInput {
  body: string;
  compensationText?: string | null;
  startDate?: string | null;
  reportingManager?: string | null;
  workLocation?: string | null;
  status?: string | null;
}

export interface ScheduleOfferPresentationMeetingInput {
  meetingAtUtc: string;
  locationText: string;
  notes?: string | null;
}

export interface HiringOutcomeInput {
  outcome: 'Offered' | 'OfferDeclined' | 'Rejected' | 'OnHold' | 'Hired' | 'Joined' | string;
  reason?: string | null;
  joiningDate?: string | null;
}

export interface HiringOutcomeResult {
  jobApplicationId: string;
  jobRequestId: string;
  applicationStatus: string;
  jobRequestStatus: string;
  joiningDate?: string | null;
  fulfilledPositions: number;
  requiredPositions: number;
}

export interface CloseJobRequestInput {
  reason: string;
}

export interface JobPostSkill {
  skillId: string;
  name: string;
  category?: string | null;
}

export interface JobPostInterviewRound {
  jobPostInterviewRoundId?: string | null;
  interviewTemplateRoundId?: string | null;
  roundOrder: number;
  name: string;
  ownerUserId?: string | null;
  ownerUserName?: string | null;
  durationMinutes: number;
  status: 'Active' | 'Inactive' | string;
}

export interface InterviewTemplateOption {
  interviewTemplateId: string;
  name: string;
  departmentName: string;
  description: string;
  rounds: JobPostInterviewRound[];
}

export interface InterviewerOption {
  userId: string;
  displayName: string;
  email: string;
  departmentId?: string | null;
  departmentName?: string | null;
  designation?: string | null;
  roleNames: string[];
  completedInterviewCount: number;
  isJobDepartmentMatch: boolean;
  isDepartmentHod: boolean;
}

export interface BenchEmployee {
  employeeId: string;
  displayName: string;
  email: string;
  designation?: string | null;
  department: string;
  location: string;
  experienceYears?: number | null;
  joiningDate?: string | null;
  availabilityStatus: string;
  benchStatus: string;
  isCurrentlyBenched: boolean;
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  projectEvidence: EmployeeProjectEvidence[];
}

export interface EmployeeProjectEvidence {
  projectName: string;
  clientName?: string | null;
  status: string;
  allocationPercent: number;
  startsOn?: string | null;
  endsOn?: string | null;
}

export interface BenchMatch {
  employeeId: string;
  rank: number;
  score: number;
  confidence: string;
  explanation: string;
  strengths: string[];
  gaps: string[];
  projectEvidence: EmployeeProjectEvidence[];
  webResearchStatus: string;
  webSummary: string;
  webSources: BenchMatchWebSource[];
  agentRunId?: string | null;
  generatedAt: string;
}

export interface BenchMatchWebSource {
  query: string;
  title: string;
  url?: string | null;
  snippet: string;
}

export interface CandidateApplicationEvidence {
  jobApplicationId: string;
  jobRequestId: string;
  requestCode: string;
  jobTitle: string;
  jobPostId?: string | null;
  jobPostTitle?: string | null;
  jobPostStatus?: string | null;
  displayJobTitle?: string | null;
  client: string;
  department: string;
  location: string;
  status: string;
  sourceLabel: string;
  appliedAt: string;
  finalDecisionAt?: string | null;
  finalDecisionReason?: string | null;
  interviewsPassed?: number | null;
  interviewsTotal?: number | null;
  interviewPassSummary?: string | null;
}

export interface CandidateInterviewEvidence {
  interviewId: string;
  jobApplicationId: string;
  roundName: string;
  status: string;
  recommendation?: string | null;
  technicalScore?: number | null;
  communicationScore?: number | null;
  cultureScore?: number | null;
  feedbackSummary?: string | null;
  submittedAt?: string | null;
}

export interface TalentRediscoveryMatch {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  currentDesignation?: string | null;
  experienceYears?: number | null;
  noticePeriodDays?: number | null;
  rank: number;
  score: number;
  confidence: string;
  explanation: string;
  strengths: string[];
  gaps: string[];
  applicationEvidence: CandidateApplicationEvidence[];
  interviewEvidence: CandidateInterviewEvidence[];
  agentRunId?: string | null;
  generatedAt: string;
}

export interface ApplicantRankingMatch {
  jobApplicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  currentDesignation?: string | null;
  experienceYears?: number | null;
  noticePeriodDays?: number | null;
  rank: number;
  score: number;
  confidence: string;
  explanation: string;
  strengths: string[];
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  documentEvidence: string[];
  historicalOutcomeEvidence: string[];
  semanticSimilarityStatus: string;
  agentRunId?: string | null;
  generatedAt: string;
}

export interface RankBenchMatchesResult {
  benchMatches: BenchMatch[];
  agentRunId: string;
  model: string;
  generatedAtUtc: string;
  webResearchStatus: string;
}

export interface RankTalentRediscoveryResult {
  talentRediscoveryMatches: TalentRediscoveryMatch[];
  agentRunId: string;
  model: string;
  generatedAtUtc: string;
}

export interface RankApplicantRankingsResult {
  applicantRankings: ApplicantRankingMatch[];
  agentRunId: string;
  model: string;
  generatedAtUtc: string;
  semanticSimilarityStatus: string;
}

export interface SendCandidateInvitationsInput {
  candidateIds: string[];
  jobPostId?: string | null;
  message?: string | null;
}

export interface SendCandidateInvitationsResult {
  queuedCount: number;
  skippedCandidates: string[];
}

export interface HistoricalCandidateSummary {
  candidateId: string;
  displayName: string;
  email: string;
  status: string;
  currentDesignation?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  noticePeriodDays?: number | null;
}

export interface HistoricalApplicationSummary {
  jobApplicationId: string;
  jobRequestId: string;
  requestCode: string;
  jobPostId?: string | null;
  jobPostTitle?: string | null;
  jobPostStatus?: string | null;
  displayJobTitle: string;
  client: string;
  department: string;
  location: string;
  status: string;
  sourceLabel: string;
  appliedAt: string;
  finalDecisionAt?: string | null;
  finalDecisionReason?: string | null;
  interviewsPassed: number;
  interviewsTotal: number;
  interviewPassSummary: string;
}

export interface HistoricalInterviewDetail {
  interviewId: string;
  roundName: string;
  status: string;
  recommendation?: string | null;
  technicalScore?: number | null;
  communicationScore?: number | null;
  cultureScore?: number | null;
  averageScore?: number | null;
  feedbackSummary?: string | null;
  startsAt: string;
  submittedAt?: string | null;
}

export interface HistoricalApplicationDetail {
  candidate: HistoricalCandidateSummary;
  application: HistoricalApplicationSummary;
  interviews: HistoricalInterviewDetail[];
}

export interface CandidateProfileSkill {
  skillId: string;
  skillName: string;
  skillLevel: string;
  yearsExperience?: number | null;
  isPrimary: boolean;
}

export interface CandidateProfile {
  candidate: HistoricalCandidateSummary;
  skills: CandidateProfileSkill[];
  applications: HistoricalApplicationSummary[];
  meetingEvents: CandidateMeetingEvent[];
}

export interface CandidateMeetingParticipant {
  displayName: string;
  email: string;
  role: string;
  isOptional: boolean;
}

export interface CandidateMeetingEvent {
  interviewId: string;
  jobApplicationId: string;
  jobRequestId: string;
  jobPostId?: string | null;
  requestCode: string;
  jobTitle: string;
  client: string;
  roundName: string;
  status: string;
  startsAt: string;
  durationMinutes: number;
  meetingLink?: string | null;
  calendarProvider?: string | null;
  calendarEventId?: string | null;
  calendarEventHtmlLink?: string | null;
  locationText?: string | null;
  participants: CandidateMeetingParticipant[];
}

export interface EmployeeReferral {
  referralId: string;
  jobRequestId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  designation?: string | null;
  department: string;
  experienceYears?: number | null;
  referredByUserId: string;
  referredByName: string;
  presalesUserId?: string | null;
  presalesName?: string | null;
  status: string;
  fitScore?: number | null;
  recommendationSummary?: string | null;
  clientFeedback?: string | null;
  createdAt: string;
}

export interface CreateEmployeeReferralsInput {
  employeeIds: string[];
  presalesUserId: string;
  recommendationSummary?: string | null;
}

export interface EmployeeReferralDecisionInput {
  decisions: EmployeeReferralDecisionItem[];
}

export interface EmployeeReferralDecisionItem {
  referralId: string;
  decision: 'Accept' | 'Reject';
  feedback?: string | null;
}

export interface CreateJobPostInput {
  interviewTemplateId: string;
  title: string;
  description: string;
  skillIds: string[];
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  requiredPositions: number;
  interviewRounds: UpsertJobPostInterviewRoundInput[];
}

export interface UpdateJobPostInput {
  title: string;
  description: string;
  skillIds: string[];
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  requiredPositions: number;
  interviewRounds: UpsertJobPostInterviewRoundInput[];
}

export interface UpsertJobPostInterviewRoundInput {
  jobPostInterviewRoundId?: string | null;
  interviewTemplateRoundId?: string | null;
  roundOrder: number;
  name: string;
  ownerUserId?: string | null;
  durationMinutes: number;
  status: 'Active' | 'Inactive';
}

export interface WorkflowAssignment {
  id: string;
  entityType: 'JobRequest';
  entityId: string;
  stage: JobRequestStage;
  assignedToGroupId?: string;
  assignedToUserId?: string;
  claimedByUserId?: string;
  status: AssignmentStatus;
  assignedAt: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  title: string;
  message: string;
  category?: string;
  severity?: string;
  entityType?: 'JobRequest' | 'WorkflowAssignment' | 'AdminCenter' | string;
  entityId?: string;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface RealtimeNotification {
  notificationId: string;
  tenantId: string;
  recipientUserId?: string | null;
  title: string;
  message: string;
  category: string;
  severity: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAtUtc: string;
  metadata?: Record<string, string>;
}

export interface ActivityEvent {
  id: string;
  entityId: string;
  actorName: string;
  title: string;
  detail: string;
  createdAt: string;
}

export type TenantStatus = 'Active' | 'Inactive';
export type CandidateCvFormat = 'DOCX';
export type TenantCurrency = 'PKR' | 'USD' | 'EUR';
export type NotificationEmailProvider = 'Resend' | 'MicrosoftGraph';
export type AdminCenterAccessMode = 'FullAccess' | 'ReadOnly';

export interface TenantProfileSettings {
  tenantId: string;
  displayName: string;
  slug: string;
  domain: string;
  adminContactEmail: string;
  defaultTimezone: string;
  defaultCurrency: TenantCurrency;
  status: TenantStatus;
  careerDisplayName: string;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyCountry?: string | null;
  officialEmail?: string | null;
  officialPhone?: string | null;
  primaryColor: string;
  candidateLoginRequired: boolean;
  candidateCvFormat: CandidateCvFormat;
  publicJobsEnabled: boolean;
  inviteExpiryDays: number;
  reapplyCooldownDays: number;
  notificationEmailProvider: NotificationEmailProvider;
  adminCenterAccessMode: AdminCenterAccessMode;
  userCount: number;
  roleCount: number;
  setupComplete: boolean;
  configuredLlmModel: string;
  configuredEmbeddingModel: string;
  logoFileName?: string | null;
  logoContentType?: string | null;
  logoContentBase64?: string | null;
  updatedAt: string;
}

export type UpdateTenantProfileSettingsInput = Pick<
  TenantProfileSettings,
  | 'displayName'
  | 'slug'
  | 'domain'
  | 'adminContactEmail'
  | 'defaultTimezone'
  | 'defaultCurrency'
  | 'status'
  | 'careerDisplayName'
  | 'companyAddress'
  | 'companyCity'
  | 'companyCountry'
  | 'officialEmail'
  | 'officialPhone'
  | 'primaryColor'
  | 'candidateLoginRequired'
  | 'candidateCvFormat'
  | 'publicJobsEnabled'
  | 'inviteExpiryDays'
  | 'reapplyCooldownDays'
  | 'notificationEmailProvider'
  | 'adminCenterAccessMode'
  | 'logoFileName'
  | 'logoContentType'
  | 'logoContentBase64'
>;
