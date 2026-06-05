import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpContext, HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ActivityEvent,
  AddManualCandidateInput,
  AddManualCandidateResult,
  CandidateProfile,
  CloseJobRequestInput,
  CreateEmployeeReferralsInput,
  CreateJobPostInput,
  CreateJobRequestInput,
  CreateJobRequestResult,
  DraftJobDescriptionInput,
  DraftJobDescriptionResult,
  EmployeeReferralDecisionInput,
  ForwardToHiringManagerResult,
  GenerateInterviewQuestionRecommendationsInput,
  GenerateOfferLetterInput,
  HistoricalApplicationDetail,
  HiringManagerDashboard,
  HiringManagerReviewList,
  HiringOutcomeInput,
  HiringOutcomeResult,
  HiringReviewDetail,
  InterviewQuestionRecommendationSet,
  InterviewTaskList,
  JobPost,
  JobPublishing,
  JobRequest,
  JobRequestIntakeOptions,
  Notification,
  OnlineCandidateLead,
  OnlineHeadhuntingQueuedResult,
  OnlineHeadhuntingResult,
  OnlineHeadhuntingSearchInput,
  OperationsPerson,
  OperationsSnapshot,
  ParseCandidateCvResult,
  PmoDashboard,
  PmoDashboardQuery,
  PmoReview,
  PortalApplyToJobPostInput,
  PortalCandidateProfile,
  PortalJobApplicationResult,
  PortalInvitationContext,
  PortalJobPostDetail,
  PortalJobPostList,
  PortalMyApplications,
  RankApplicantRankingsResult,
  RagAssistantContextType,
  RagChatRequest,
  RagChatResponse,
  RagConversation,
  RagFeedbackRequest,
  PortalUploadApplicationDocumentResult,
  RankBenchMatchesResult,
  RankTalentRediscoveryResult,
  RealtimeNotification,
  RecruitmentQueue,
  ReportingManagerOptionList,
  RecruiterApplication,
  RecruiterSourcing,
  ScheduleCandidateInterviewInput,
  ScheduleCandidateInterviewResult,
  ScheduleOfferPresentationMeetingInput,
  SendCandidateInvitationsInput,
  SendCandidateInvitationsResult,
  SubmitInterviewFeedbackInput,
  SubmitInterviewFeedbackResult,
  TenantAdminDashboard,
  TenantAdminDashboardQuery,
  UpdateCandidateApplicationStatusInput,
  UpdateJobPostInput,
  UpdatePortalCandidateProfileInput,
  OfferLetterDetails,
  OfferPresentationMeetingDetails,
  UpdateOfferLetterInput,
  WorkflowAssignment,
} from './models';
import { AuthService } from './auth.service';
import { SUPPRESS_API_ERROR_TOAST } from './interceptors/api-error.interceptor';
import { ApiService } from './services/api.service';

@Injectable({ providedIn: 'root' })
export class TalentPilotStoreService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly peopleSignal = signal<OperationsPerson[]>([]);
  private readonly jobRequestsSignal = signal<JobRequest[]>([]);
  private readonly assignmentsSignal = signal<WorkflowAssignment[]>([]);
  private readonly notificationsSignal = signal<Notification[]>([]);
  private readonly activitySignal = signal<ActivityEvent[]>([]);
  private readonly intakeOptionsSignal = signal<JobRequestIntakeOptions | null>(null);
  private readonly pmoReviewsSignal = signal<Record<string, PmoReview>>({});
  private readonly loadingSignal = signal(false);
  private readonly recruiterSourcingRefreshSignal = signal<{
    jobRequestId: string;
    reason: string;
    leadCount?: number | null;
    at: string;
  } | null>(null);

  readonly people = this.peopleSignal.asReadonly();
  readonly jobRequests = this.jobRequestsSignal.asReadonly();
  readonly assignments = this.assignmentsSignal.asReadonly();
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly activity = this.activitySignal.asReadonly();
  readonly intakeOptions = this.intakeOptionsSignal.asReadonly();
  readonly pmoReviews = this.pmoReviewsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly recruiterSourcingRefresh = this.recruiterSourcingRefreshSignal.asReadonly();

  readonly openJobRequests = computed(() =>
    this.jobRequestsSignal().filter((request) => request.stage !== 'Closed'),
  );

  readonly pmoQueue = computed(() =>
    this.assignmentsSignal()
      .filter((assignment) => assignment.stage === 'PMO Review')
      .filter((assignment) => assignment.status !== 'Completed')
      .map((assignment) => ({
        assignment,
        jobRequest: this.getJobRequestById(assignment.entityId),
      }))
      .filter(
        (item): item is { assignment: WorkflowAssignment; jobRequest: JobRequest } =>
          item.jobRequest !== undefined,
      ),
  );

  readonly myWork = computed(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [];
    }

    return this.assignmentsSignal()
      .filter((assignment) => assignment.status !== 'Completed')
      .filter((assignment) => assignment.assignedToUserId === user.id || assignment.claimedByUserId === user.id)
      .map((assignment) => ({
        assignment,
        jobRequest: this.getJobRequestById(assignment.entityId),
      }))
      .filter(
        (item): item is { assignment: WorkflowAssignment; jobRequest: JobRequest } =>
          item.jobRequest !== undefined,
      );
  });

  private snapshotUserId: string | null = null;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      if (this.snapshotUserId === userId) {
        return;
      }

      this.snapshotUserId = userId;
      queueMicrotask(() => this.handleUserSnapshotChange(userId));
    });
  }

  async refreshSnapshot(): Promise<void> {
    const requestUserId = this.auth.currentUser()?.id ?? null;
    if (!requestUserId) {
      this.clearScopedState();
      return;
    }

    this.loadingSignal.set(true);

    try {
      const snapshot = await firstValueFrom(this.api.get<OperationsSnapshot>('talent-pilot/snapshot'));
      if (this.auth.currentUser()?.id !== requestUserId) {
        return;
      }

      this.peopleSignal.set(snapshot.people);
      this.jobRequestsSignal.set(snapshot.jobRequests);
      this.assignmentsSignal.set(snapshot.assignments);
      this.notificationsSignal.set(this.mergeNotifications(snapshot.notifications));
    } finally {
      if (this.auth.currentUser()?.id === requestUserId) {
        this.loadingSignal.set(false);
      }
    }
  }

  async loadTenantAdminDashboard(query: TenantAdminDashboardQuery = {}): Promise<TenantAdminDashboard> {
    const searchParams = new URLSearchParams();
    if (query.fromUtc) {
      searchParams.set('fromUtc', query.fromUtc);
    }
    if (query.toUtc) {
      searchParams.set('toUtc', query.toUtc);
    }
    if (query.departmentId) {
      searchParams.set('departmentId', query.departmentId);
    }
    if (query.sourceLabel) {
      searchParams.set('sourceLabel', query.sourceLabel);
    }
    if (query.recruiterUserId) {
      searchParams.set('recruiterUserId', query.recruiterUserId);
    }

    const queryString = searchParams.toString();
    return firstValueFrom(
      this.api.get<TenantAdminDashboard>(
        queryString ? `talent-pilot/tenant-admin/dashboard?${queryString}` : 'talent-pilot/tenant-admin/dashboard',
      ),
    );
  }

  async loadPmoDashboard(query: PmoDashboardQuery = {}): Promise<PmoDashboard> {
    const searchParams = new URLSearchParams();
    if (query.fromUtc) {
      searchParams.set('fromUtc', query.fromUtc);
    }
    if (query.toUtc) {
      searchParams.set('toUtc', query.toUtc);
    }
    if (query.departmentId) {
      searchParams.set('departmentId', query.departmentId);
    }

    const queryString = searchParams.toString();
    return firstValueFrom(
      this.api.get<PmoDashboard>(
        queryString ? `talent-pilot/pmo/dashboard?${queryString}` : 'talent-pilot/pmo/dashboard',
      ),
    );
  }

  async loadHiringManagerDashboard(): Promise<HiringManagerDashboard> {
    return firstValueFrom(this.api.get<HiringManagerDashboard>('talent-pilot/hiring-manager/dashboard'));
  }

  async createJobRequest(input: CreateJobRequestInput): Promise<JobRequest> {
    const result = await firstValueFrom(
      this.api.post<CreateJobRequestResult, CreateJobRequestInput>('talent-pilot/job-requests', input),
    );

    this.jobRequestsSignal.update((items) => [result.jobRequest, ...items]);
    this.assignmentsSignal.update((items) => [result.assignment, ...items]);
    await this.loadActivityForEntity(result.jobRequest.id);
    return result.jobRequest;
  }

  private handleUserSnapshotChange(userId: string | null): void {
    const currentUserId = this.auth.currentUser()?.id ?? null;
    if (currentUserId !== userId) {
      return;
    }

    this.clearScopedState();

    if (userId) {
      void this.refreshSnapshot();
    }
  }

  private clearScopedState(): void {
    this.peopleSignal.set([]);
    this.jobRequestsSignal.set([]);
    this.assignmentsSignal.set([]);
    this.notificationsSignal.set([]);
    this.activitySignal.set([]);
    this.intakeOptionsSignal.set(null);
    this.pmoReviewsSignal.set({});
    this.loadingSignal.set(false);
  }

  async draftJobDescription(input: DraftJobDescriptionInput): Promise<DraftJobDescriptionResult> {
    return firstValueFrom(
      this.api.post<DraftJobDescriptionResult, DraftJobDescriptionInput>(
        'talent-pilot/job-requests/description-draft',
        input,
      ),
    );
  }

  async loadIntakeOptions(): Promise<JobRequestIntakeOptions> {
    const options = await firstValueFrom(
      this.api.get<JobRequestIntakeOptions>('talent-pilot/job-requests/intake-options'),
    );
    this.intakeOptionsSignal.set(options);
    return options;
  }

  async claimAssignment(assignmentId: string): Promise<void> {
    await firstValueFrom(this.api.post<void, Record<string, never>>(`talent-pilot/workflow-assignments/${assignmentId}/claim`, {}));
    await this.refreshSnapshot();
  }

  async loadPmoReview(jobRequestId: string): Promise<PmoReview> {
    const review = await firstValueFrom(
      this.api.get<PmoReview>(`talent-pilot/job-requests/${jobRequestId}/pmo-review`),
    );
    this.pmoReviewsSignal.update((items) => ({ ...items, [jobRequestId]: review }));
    this.upsertJobRequest(review.jobRequest);
    if (review.assignment) {
      this.upsertAssignment(review.assignment);
    }
    return review;
  }

  async rankBenchMatches(jobRequestId: string): Promise<RankBenchMatchesResult> {
    const result = await firstValueFrom(
      this.api.post<RankBenchMatchesResult, Record<string, never>>(
        `talent-pilot/job-requests/${jobRequestId}/bench-matches/rank`,
        {},
      ),
    );

    this.pmoReviewsSignal.update((items) => {
      const current = items[jobRequestId];
      if (!current) {
        return items;
      }

      return {
        ...items,
        [jobRequestId]: {
          ...current,
          benchMatches: result.benchMatches,
        },
      };
    });

    return result;
  }

  async createEmployeeReferrals(jobRequestId: string, input: CreateEmployeeReferralsInput): Promise<void> {
    await firstValueFrom(
      this.api.post<void, CreateEmployeeReferralsInput>(
        `talent-pilot/job-requests/${jobRequestId}/employee-referrals`,
        input,
      ),
    );
    await this.refreshSnapshot();
    await this.loadPmoReview(jobRequestId);
    await this.loadActivityForEntity(jobRequestId);
  }

  async forwardToRecruiters(jobRequestId: string): Promise<void> {
    await firstValueFrom(
      this.api.post<void, Record<string, never>>(
        `talent-pilot/job-requests/${jobRequestId}/forward-to-recruiters`,
        {},
      ),
    );
    await this.refreshSnapshot();
    await this.loadPmoReview(jobRequestId);
    await this.loadActivityForEntity(jobRequestId);
  }

  async decideEmployeeReferrals(jobRequestId: string, input: EmployeeReferralDecisionInput): Promise<void> {
    await firstValueFrom(
      this.api.post<void, EmployeeReferralDecisionInput>(
        `talent-pilot/job-requests/${jobRequestId}/employee-referrals/decision`,
        input,
      ),
    );
    await this.refreshSnapshot();
    await this.loadPmoReview(jobRequestId);
    await this.loadActivityForEntity(jobRequestId);
  }

  async loadRecruitmentQueue(): Promise<RecruitmentQueue> {
    return firstValueFrom(this.api.get<RecruitmentQueue>('talent-pilot/recruitment/queue'));
  }

  async loadRecruiterSourcing(jobRequestId: string): Promise<RecruiterSourcing> {
    const sourcing = await firstValueFrom(
      this.api.get<RecruiterSourcing>(`talent-pilot/job-requests/${jobRequestId}/recruiter-sourcing`),
    );
    sourcing.applications = (sourcing.applications ?? []).map((application) => ({
      ...application,
      documents: application.documents ?? [],
    }));
    this.upsertJobRequest(sourcing.jobRequest);
    if (sourcing.assignment) {
      this.upsertAssignment(sourcing.assignment);
    }
    return sourcing;
  }

  async loadHistoricalApplication(jobApplicationId: string): Promise<HistoricalApplicationDetail> {
    return firstValueFrom(
      this.api.get<HistoricalApplicationDetail>(
        `talent-pilot/recruitment/applications/${jobApplicationId}/history`,
      ),
    );
  }

  async downloadRecruiterApplicationDocument(
    jobApplicationId: string,
    applicationDocumentId: string,
  ): Promise<HttpResponse<Blob>> {
    return firstValueFrom(
      this.api.download(
        `talent-pilot/recruitment/applications/${jobApplicationId}/documents/${applicationDocumentId}/download`,
      ),
    );
  }

  async loadCandidateProfile(candidateId: string): Promise<CandidateProfile> {
    return firstValueFrom(
      this.api.get<CandidateProfile>(`talent-pilot/recruitment/candidates/${candidateId}/profile`),
    );
  }

  async rankTalentRediscovery(jobRequestId: string): Promise<RankTalentRediscoveryResult> {
    const result = await firstValueFrom(
      this.api.post<RankTalentRediscoveryResult, Record<string, never>>(
        `talent-pilot/job-requests/${jobRequestId}/talent-rediscovery/rank`,
        {},
      ),
    );
    await this.loadActivityForEntity(jobRequestId);
    return result;
  }

  async rankApplicantRankings(jobPostId: string): Promise<RankApplicantRankingsResult> {
    return firstValueFrom(
      this.api.post<RankApplicantRankingsResult, Record<string, never>>(
        `talent-pilot/job-posts/${jobPostId}/applicant-rankings/rank`,
        {},
      ),
    );
  }

  async searchOnlineCandidates(
    jobRequestId: string,
    input: OnlineHeadhuntingSearchInput,
  ): Promise<OnlineHeadhuntingQueuedResult> {
    return firstValueFrom(
      this.api.post<OnlineHeadhuntingQueuedResult, OnlineHeadhuntingSearchInput>(
        `talent-pilot/job-requests/${jobRequestId}/online-headhunting/search`,
        input,
      ),
    );
  }

  notifyRecruiterSourcingUpdated(jobRequestId: string, reason = 'realtime', leadCount: number | null = null): void {
    this.recruiterSourcingRefreshSignal.set({
      jobRequestId,
      reason,
      leadCount,
      at: new Date().toISOString(),
    });
  }

  async updateOnlineCandidateLeadStatus(
    onlineCandidateLeadId: string,
    status: 'New' | 'Shortlisted' | 'Rejected',
  ): Promise<OnlineCandidateLead> {
    return firstValueFrom(
      this.api.patch<OnlineCandidateLead, { status: string }>(
        `talent-pilot/online-headhunting/leads/${onlineCandidateLeadId}/status`,
        { status },
      ),
    );
  }

  async sendAssistantMessage(input: RagChatRequest): Promise<RagChatResponse> {
    return firstValueFrom(this.api.post<RagChatResponse, RagChatRequest>('talent-pilot/ai-assistant/messages', input));
  }

  async loadAssistantConversation(
    contextType: RagAssistantContextType,
    contextEntityId: string,
    focusEntityId?: string | null,
  ): Promise<RagConversation | null> {
    const params = new URLSearchParams();
    params.set('contextType', contextType);
    params.set('contextEntityId', contextEntityId);
    if (focusEntityId) {
      params.set('focusEntityId', focusEntityId);
    }

    const conversations = await firstValueFrom(
      this.api.get<RagConversation[]>(`talent-pilot/ai-assistant/conversations?${params.toString()}`),
    );
    return conversations[0] ?? null;
  }

  async loadAssistantConversationById(conversationId: string): Promise<RagConversation> {
    return firstValueFrom(
      this.api.get<RagConversation>(`talent-pilot/ai-assistant/conversations/${conversationId}`),
    );
  }

  async submitAssistantFeedback(messageId: string, input: RagFeedbackRequest): Promise<void> {
    await firstValueFrom(
      this.api.post<void, RagFeedbackRequest>(`talent-pilot/ai-assistant/messages/${messageId}/feedback`, input),
    );
  }

  async sendCandidateInvitations(
    jobRequestId: string,
    input: SendCandidateInvitationsInput,
  ): Promise<SendCandidateInvitationsResult> {
    const result = await firstValueFrom(
      this.api.post<SendCandidateInvitationsResult, SendCandidateInvitationsInput>(
        `talent-pilot/job-requests/${jobRequestId}/candidate-invitations`,
        input,
      ),
    );
    await this.loadActivityForEntity(jobRequestId);
    return result;
  }

  async loadJobPublishing(): Promise<JobPublishing> {
    return firstValueFrom(this.api.get<JobPublishing>('talent-pilot/job-posts'));
  }

  async loadPortalJobPosts(): Promise<PortalJobPostList> {
    return firstValueFrom(this.api.get<PortalJobPostList>('talent-pilot/portal/job-posts'));
  }

  async loadPortalJobPost(jobPostId: string): Promise<PortalJobPostDetail> {
    return firstValueFrom(this.api.get<PortalJobPostDetail>(`talent-pilot/portal/job-posts/${jobPostId}`));
  }

  async loadPortalInvitation(candidateInvitationId: string, token: string): Promise<PortalInvitationContext> {
    return firstValueFrom(
      this.api.get<PortalInvitationContext>(
        `talent-pilot/portal/invitations/${candidateInvitationId}?token=${encodeURIComponent(token)}`,
      ),
    );
  }

  async applyToPortalJobPost(
    jobPostId: string,
    input: PortalApplyToJobPostInput,
  ): Promise<PortalJobApplicationResult> {
    return firstValueFrom(
      this.api.post<PortalJobApplicationResult, PortalApplyToJobPostInput>(
        `talent-pilot/portal/job-posts/${jobPostId}/applications`,
        input,
      ),
    );
  }

  async uploadPortalApplicationDocument(
    jobApplicationId: string,
    file: File,
    documentType = 'Resume',
  ): Promise<PortalUploadApplicationDocumentResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    return firstValueFrom(
      this.api.post<PortalUploadApplicationDocumentResult, FormData>(
        `talent-pilot/portal/job-applications/${jobApplicationId}/documents`,
        formData,
      ),
    );
  }

  async loadPortalMyApplications(): Promise<PortalMyApplications> {
    return firstValueFrom(this.api.get<PortalMyApplications>('talent-pilot/portal/my-applications'));
  }

  async loadPortalCandidateProfile(): Promise<PortalCandidateProfile> {
    return firstValueFrom(this.api.get<PortalCandidateProfile>('talent-pilot/portal/profile'));
  }

  async updatePortalCandidateProfile(
    input: UpdatePortalCandidateProfileInput,
  ): Promise<PortalCandidateProfile> {
    return firstValueFrom(
      this.api.put<PortalCandidateProfile, UpdatePortalCandidateProfileInput>('talent-pilot/portal/profile', input),
    );
  }

  async createJobPost(jobRequestId: string, input: CreateJobPostInput): Promise<JobPost> {
    const jobPost = await firstValueFrom(
      this.api.post<JobPost, CreateJobPostInput>(`talent-pilot/job-requests/${jobRequestId}/job-posts`, input),
    );
    await this.refreshSnapshot();
    await this.loadActivityForEntity(jobRequestId);
    return jobPost;
  }

  async updateJobPost(jobPostId: string, input: UpdateJobPostInput): Promise<JobPost> {
    const jobPost = await firstValueFrom(this.api.put<JobPost, UpdateJobPostInput>(`talent-pilot/job-posts/${jobPostId}`, input));
    await this.loadActivityForEntity(jobPost.jobRequestId);
    return jobPost;
  }

  async publishJobPost(jobPostId: string): Promise<JobPost> {
    const jobPost = await firstValueFrom(
      this.api.post<JobPost, Record<string, never>>(`talent-pilot/job-posts/${jobPostId}/publish`, {}),
    );
    await this.refreshSnapshot();
    await this.loadActivityForEntity(jobPost.jobRequestId);
    return jobPost;
  }

  async closeJobPost(jobPostId: string): Promise<JobPost> {
    const jobPost = await firstValueFrom(
      this.api.post<JobPost, Record<string, never>>(`talent-pilot/job-posts/${jobPostId}/close`, {}),
    );
    await this.refreshSnapshot();
    await this.loadActivityForEntity(jobPost.jobRequestId);
    return jobPost;
  }

  async addManualCandidateToJobPost(
    jobPostId: string,
    input: AddManualCandidateInput,
  ): Promise<AddManualCandidateResult> {
    return firstValueFrom(
      this.api.post<AddManualCandidateResult, AddManualCandidateInput>(
        `talent-pilot/job-posts/${jobPostId}/manual-candidates`,
        input,
      ),
    );
  }

  async parseCandidateCv(file: File): Promise<ParseCandidateCvResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return firstValueFrom(
      this.api.post<ParseCandidateCvResult, FormData>('talent-pilot/candidates/cv-parse', formData),
    );
  }

  async updateCandidateApplicationStatus(
    jobApplicationId: string,
    input: UpdateCandidateApplicationStatusInput,
  ): Promise<RecruiterApplication> {
    return firstValueFrom(
      this.api.post<RecruiterApplication, UpdateCandidateApplicationStatusInput>(
        `talent-pilot/job-applications/${jobApplicationId}/screening-decision`,
        input,
      ),
    );
  }

  async scheduleCandidateInterview(
    jobApplicationId: string,
    input: ScheduleCandidateInterviewInput,
  ): Promise<ScheduleCandidateInterviewResult> {
    return firstValueFrom(
      this.api.post<ScheduleCandidateInterviewResult, ScheduleCandidateInterviewInput>(
        `talent-pilot/job-applications/${jobApplicationId}/interviews`,
        input,
      ),
    );
  }

  async loadMyInterviewTasks(): Promise<InterviewTaskList> {
    return firstValueFrom(this.api.get<InterviewTaskList>('talent-pilot/interviews/my-tasks'));
  }

  async loadInterviewQuestionRecommendations(interviewId: string): Promise<InterviewQuestionRecommendationSet | null> {
    try {
      return await firstValueFrom(
        this.api.get<InterviewQuestionRecommendationSet>(
          `talent-pilot/interviews/${interviewId}/question-recommendations`,
          {
            context: new HttpContext().set(SUPPRESS_API_ERROR_TOAST, true),
          },
        ),
      );
    } catch {
      return null;
    }
  }

  async generateInterviewQuestionRecommendations(
    interviewId: string,
    input: GenerateInterviewQuestionRecommendationsInput = {},
  ): Promise<InterviewQuestionRecommendationSet> {
    return firstValueFrom(
      this.api.post<InterviewQuestionRecommendationSet, GenerateInterviewQuestionRecommendationsInput>(
        `talent-pilot/interviews/${interviewId}/question-recommendations/generate`,
        input,
      ),
    );
  }

  async downloadInterviewQuestionRecommendationsDocx(interviewId: string): Promise<HttpResponse<Blob>> {
    return firstValueFrom(
      this.api.download(`talent-pilot/interviews/${interviewId}/question-recommendations/download`),
    );
  }

  async submitInterviewFeedback(
    interviewId: string,
    input: SubmitInterviewFeedbackInput,
  ): Promise<SubmitInterviewFeedbackResult> {
    return firstValueFrom(
      this.api.post<SubmitInterviewFeedbackResult, SubmitInterviewFeedbackInput>(
        `talent-pilot/interviews/${interviewId}/feedback`,
        input,
      ),
    );
  }

  async forwardToHiringManager(jobApplicationId: string): Promise<ForwardToHiringManagerResult> {
    const result = await firstValueFrom(
      this.api.post<ForwardToHiringManagerResult, Record<string, never>>(
        `talent-pilot/job-applications/${jobApplicationId}/forward-to-hiring-manager`,
        {},
      ),
    );

    try {
      await this.refreshSnapshot();
      await this.loadActivityForEntity(result.jobRequestId);
    } catch {
      // The handoff already succeeded; callers can refresh the screen again if needed.
    }

    return result;
  }

  async loadHiringManagerReviews(): Promise<HiringManagerReviewList> {
    return firstValueFrom(this.api.get<HiringManagerReviewList>('talent-pilot/hiring-manager/reviews'));
  }

  async loadHiringReview(jobApplicationId: string): Promise<HiringReviewDetail> {
    return firstValueFrom(
      this.api.get<HiringReviewDetail>(`talent-pilot/job-applications/${jobApplicationId}/hiring-review`),
    );
  }

  async searchReportingManagerOptions(
    jobRequestId: string,
    search = '',
    skip = 0,
    take = 20,
  ): Promise<ReportingManagerOptionList> {
    const params = new URLSearchParams();
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    }

    params.set('skip', String(Math.max(0, skip)));
    params.set('take', String(Math.max(1, take)));

    return firstValueFrom(
      this.api.get<ReportingManagerOptionList>(
        `talent-pilot/job-requests/${jobRequestId}/reporting-manager-options?${params.toString()}`,
      ),
    );
  }

  async generateOfferLetter(
    jobApplicationId: string,
    input: GenerateOfferLetterInput,
  ): Promise<OfferLetterDetails> {
    return firstValueFrom(
      this.api.post<OfferLetterDetails, GenerateOfferLetterInput>(
        `talent-pilot/job-applications/${jobApplicationId}/offer-letter`,
        input,
      ),
    );
  }

  async updateOfferLetter(
    offerLetterId: string,
    input: UpdateOfferLetterInput,
  ): Promise<OfferLetterDetails> {
    return firstValueFrom(
      this.api.put<OfferLetterDetails, UpdateOfferLetterInput>(
        `talent-pilot/offer-letters/${offerLetterId}`,
        input,
      ),
    );
  }

  async scheduleOfferPresentationMeeting(
    offerLetterId: string,
    input: ScheduleOfferPresentationMeetingInput,
  ): Promise<OfferPresentationMeetingDetails> {
    return firstValueFrom(
      this.api.post<OfferPresentationMeetingDetails, ScheduleOfferPresentationMeetingInput>(
        `talent-pilot/offer-letters/${offerLetterId}/presentation-meeting`,
        input,
      ),
    );
  }

  async recordHiringOutcome(
    jobApplicationId: string,
    input: HiringOutcomeInput,
  ): Promise<HiringOutcomeResult> {
    const result = await firstValueFrom(
      this.api.post<HiringOutcomeResult, HiringOutcomeInput>(
        `talent-pilot/job-applications/${jobApplicationId}/hiring-outcome`,
        input,
      ),
    );
    await this.refreshSnapshot();
    await this.loadActivityForEntity(result.jobRequestId);
    return result;
  }

  async closeJobRequest(jobRequestId: string, input: CloseJobRequestInput): Promise<void> {
    await firstValueFrom(
      this.api.post<void, CloseJobRequestInput>(`talent-pilot/job-requests/${jobRequestId}/close`, input),
    );
    await this.refreshSnapshot();
    await this.loadActivityForEntity(jobRequestId);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await firstValueFrom(this.api.patch<void, Record<string, never>>(`talent-pilot/notifications/${notificationId}/read`, {}));
    this.notificationsSignal.update((items) =>
      items.map((item) => (item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item)),
    );
  }

  async markAllNotificationsRead(_userId: string): Promise<void> {
    await firstValueFrom(this.api.patch<void, Record<string, never>>('talent-pilot/notifications/read-all', {}));
    const now = new Date().toISOString();
    this.notificationsSignal.update((items) => items.map((item) => (item.readAt ? item : { ...item, readAt: now })));
  }

  addRealtimeNotification(message: RealtimeNotification, fallbackUserId?: string): void {
    const recipientUserId = message.recipientUserId ?? fallbackUserId;
    if (!recipientUserId) {
      return;
    }

    const notification: Notification = {
      id: message.notificationId,
      recipientUserId,
      title: message.title,
      message: message.message,
      category: message.category,
      severity: message.severity,
      entityType: message.entityType ?? 'AdminCenter',
      entityId: message.entityId ?? undefined,
      createdAt: message.createdAtUtc,
      metadata: message.metadata,
    };

    this.notificationsSignal.update((items) => {
      if (items.some((item) => item.id === notification.id)) {
        return items;
      }

      return [notification, ...items];
    });
  }

  private mergeNotifications(snapshotNotifications: Notification[]): Notification[] {
    const snapshotIds = new Set(snapshotNotifications.map((notification) => notification.id));
    const localNotifications = this.notificationsSignal().filter((notification) => !snapshotIds.has(notification.id));
    return [...localNotifications, ...snapshotNotifications];
  }

  async loadActivityForEntity(entityId: string): Promise<void> {
    const activity = await firstValueFrom(
      this.api.get<ActivityEvent[]>(`talent-pilot/job-requests/${entityId}/activity`),
    );

    this.activitySignal.update((items) => [
      ...activity,
      ...items.filter((item) => item.entityId !== entityId),
    ]);
  }

  getJobRequestById(id: string): JobRequest | undefined {
    return this.jobRequestsSignal().find((request) => request.id === id);
  }

  getPmoReviewByRequestId(id: string): PmoReview | undefined {
    return this.pmoReviewsSignal()[id];
  }

  getUserName(userId?: string): string {
    if (!userId) {
      return 'Unassigned';
    }

    return this.peopleSignal().find((user) => user.userId === userId)?.displayName ?? 'Unknown user';
  }

  notificationsForUser(userId: string): Notification[] {
    return this.notificationsSignal()
      .filter((notification) => notification.recipientUserId === userId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  unreadCountForUser(userId: string): number {
    return this.notificationsForUser(userId).filter((notification) => !notification.readAt).length;
  }

  activityForEntity(entityId: string): ActivityEvent[] {
    return this.activitySignal()
      .filter((event) => event.entityId === entityId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  private upsertJobRequest(jobRequest: JobRequest): void {
    this.jobRequestsSignal.update((items) => {
      const index = items.findIndex((item) => item.id === jobRequest.id);
      if (index === -1) {
        return [jobRequest, ...items];
      }

      return items.map((item) => (item.id === jobRequest.id ? jobRequest : item));
    });
  }

  private upsertAssignment(assignment: WorkflowAssignment): void {
    this.assignmentsSignal.update((items) => {
      const index = items.findIndex((item) => item.id === assignment.id);
      if (index === -1) {
        return [assignment, ...items];
      }

      return items.map((item) => (item.id === assignment.id ? assignment : item));
    });
  }
}
