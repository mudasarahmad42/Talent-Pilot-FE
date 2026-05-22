export type TalentPilotRole =
  | 'TenantAdmin'
  | 'Presales'
  | 'PMO'
  | 'Recruiter'
  | 'HiringManager'
  | 'Interviewer'
  | 'Employee'
  | 'Candidate';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type AssignmentStatus = 'Pending' | 'Claimed' | 'Completed';
export type JobRequestStage =
  | 'Draft'
  | 'PMO Review'
  | 'Bench Matching'
  | 'Presales Client Pitch'
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
}

export interface CurrentUserGroup {
  groupId: string;
  name: string;
  purpose: string;
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

export interface CreateJobRequestResult {
  jobRequest: JobRequest;
  assignment: WorkflowAssignment;
}

export interface RecruitmentQueueItem {
  assignment: WorkflowAssignment;
  jobRequest: JobRequest;
  candidateCount: number;
}

export interface ForwardToRecruiterResult {
  jobRequest: JobRequest;
  assignment: WorkflowAssignment;
  candidateCount: number;
}

export interface OperationsBenchMatch {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  email: string;
  designation?: string;
  department: string;
  location: string;
  skills: string[];
  availabilityStatus: string;
  benchStatus: string;
  currentAllocationPercent: number;
  matchScore: number;
  matchExplanation: string;
}

export interface CreateInternalResourceReferralInput {
  employeeIds: string[];
  note?: string;
}

export interface InternalEmployeeReferral {
  id: string;
  jobRequestId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  status: string;
  fitScore: number;
  recommendationSummary: string;
  referredByUserId: string;
  presalesUserId?: string;
  createdAt: string;
}

export interface CreateInternalResourceReferralResult {
  jobRequest: JobRequest;
  referrals: InternalEmployeeReferral[];
}

export interface JobRequest {
  id: string;
  code: string;
  title: string;
  client: string;
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
  description: string;
  department: string;
  skills: string[];
  experience: string;
  location: string;
  requiredPositions: number;
  priority: Priority;
  hiringManagerId: string;
}

export interface WorkflowAssignment {
  id: string;
  entityType: 'JobRequest';
  entityId: string;
  stage: JobRequestStage;
  assignedToGroupId?: string;
  assignedToGroupName?: string;
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
  entityType: string;
  entityId: string;
  readAt?: string;
  createdAt: string;
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
  primaryColor: string;
  candidateLoginRequired: boolean;
  candidateCvFormat: CandidateCvFormat;
  publicJobsEnabled: boolean;
  inviteExpiryDays: number;
  reapplyCooldownDays: number;
  userCount: number;
  roleCount: number;
  setupComplete: boolean;
  configuredLlmModel: string;
  configuredEmbeddingModel: string;
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
  | 'primaryColor'
  | 'candidateLoginRequired'
  | 'candidateCvFormat'
  | 'publicJobsEnabled'
  | 'inviteExpiryDays'
  | 'reapplyCooldownDays'
>;
