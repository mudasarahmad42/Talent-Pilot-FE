import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ActivityEvent,
  CreateInternalResourceReferralInput,
  CreateInternalResourceReferralResult,
  CreateJobRequestInput,
  CreateJobRequestResult,
  ForwardToRecruiterResult,
  JobRequest,
  Notification,
  OperationsBenchMatch,
  OperationsPerson,
  RecruitmentQueueItem,
  WorkflowAssignment,
} from './models';
import { AuthService } from './auth.service';
import { ApiService } from './services/api.service';

interface PmoQueueItem {
  assignment: WorkflowAssignment;
  jobRequest: JobRequest;
}

@Injectable({ providedIn: 'root' })
export class TalentPilotStoreService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly peopleSignal = signal<OperationsPerson[]>([]);
  private readonly jobRequestsSignal = signal<JobRequest[]>([]);
  private readonly assignmentsSignal = signal<WorkflowAssignment[]>([]);
  private readonly pmoQueueSignal = signal<PmoQueueItem[]>([]);
  private readonly recruitmentQueueSignal = signal<RecruitmentQueueItem[]>([]);
  private readonly notificationsSignal = signal<Notification[]>([]);
  private readonly activitySignal = signal<ActivityEvent[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly people = this.peopleSignal.asReadonly();
  readonly jobRequests = this.jobRequestsSignal.asReadonly();
  readonly assignments = this.assignmentsSignal.asReadonly();
  readonly pmoQueue = this.pmoQueueSignal.asReadonly();
  readonly recruitmentQueue = this.recruitmentQueueSignal.asReadonly();
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly activity = this.activitySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly openJobRequests = computed(() =>
    this.jobRequestsSignal().filter((request) => request.stage !== 'Closed'),
  );

  constructor() {
    void this.refreshOperationalData();
  }

  async refreshOperationalData(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const [jobRequestsResult, queueResult, _recruitmentQueueResult, notificationsResult] = await Promise.allSettled([
        this.loadJobRequests(),
        this.loadPmoQueue(),
        this.loadRecruitmentQueue(),
        this.loadNotifications(),
      ]);

      const failed = [jobRequestsResult, queueResult, notificationsResult].some((result) => result.status === 'rejected');
      if (failed) {
        this.errorSignal.set('Some operational data could not be loaded from the backend.');
      }
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createJobRequest(input: CreateJobRequestInput): Promise<JobRequest> {
    const result = await firstValueFrom(
      this.api.post<CreateJobRequestResult, CreateJobRequestInput>('job-requests', input),
    );

    this.jobRequestsSignal.update((items) => [result.jobRequest, ...items]);
    this.assignmentsSignal.update((items) => [result.assignment, ...items]);
    await this.loadNotifications();
    return result.jobRequest;
  }

  async loadJobRequest(id: string): Promise<JobRequest | undefined> {
    const existing = this.getJobRequestById(id);
    if (existing) {
      return existing;
    }

    try {
      const response = await firstValueFrom(this.api.get<JobRequest | { jobRequest: JobRequest }>(`job-requests/${id}`));
      const jobRequest = 'jobRequest' in response ? response.jobRequest : response;
      this.upsertJobRequest(jobRequest);
      return jobRequest;
    } catch {
      return undefined;
    }
  }

  async claimAssignment(assignmentId: string): Promise<void> {
    await firstValueFrom(this.api.post<void, Record<string, never>>(`workflow-assignments/${assignmentId}/claim`, {}));
    await Promise.all([this.loadPmoQueue(), this.loadNotifications()]);
  }

  async forwardToRecruiter(jobRequestId: string): Promise<void> {
    const result = await firstValueFrom(
      this.api.post<ForwardToRecruiterResult, Record<string, never>>(
        `job-requests/${jobRequestId}/forward-to-recruiter`,
        {},
      ),
    );

    this.upsertJobRequest(result.jobRequest);
    this.assignmentsSignal.update((items) =>
      [
        result.assignment,
        ...items.filter((item) => item.id !== result.assignment.id && item.entityId !== result.jobRequest.id),
      ].sort((first, second) => second.assignedAt.localeCompare(first.assignedAt)),
    );
    this.recruitmentQueueSignal.update((items) => [
      { assignment: result.assignment, jobRequest: result.jobRequest, candidateCount: result.candidateCount },
      ...items.filter((item) => item.assignment.id !== result.assignment.id && item.jobRequest.id !== result.jobRequest.id),
    ]);
    this.pmoQueueSignal.update((items) => items.filter((item) => item.jobRequest.id !== result.jobRequest.id));

    await Promise.all([this.loadPmoQueue(), this.loadRecruitmentQueue(), this.loadNotifications()]);
  }

  async loadBenchMatches(jobRequestId: string): Promise<OperationsBenchMatch[]> {
    const response = await firstValueFrom(
      this.api.get<OperationsBenchMatch[] | { items: OperationsBenchMatch[] }>(
        `job-requests/${jobRequestId}/bench-matches`,
      ),
    );

    return Array.isArray(response) ? response : response.items;
  }

  async createInternalResourceReferral(
    jobRequestId: string,
    input: CreateInternalResourceReferralInput,
  ): Promise<CreateInternalResourceReferralResult> {
    const result = await firstValueFrom(
      this.api.post<CreateInternalResourceReferralResult, CreateInternalResourceReferralInput>(
        `job-requests/${jobRequestId}/employee-referrals`,
        input,
      ),
    );

    this.upsertJobRequest(result.jobRequest);
    await Promise.all([this.loadPmoQueue(), this.loadNotifications(), this.loadActivityForEntity(jobRequestId)]);
    return result;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await firstValueFrom(this.api.post<void, Record<string, never>>(`notifications/${notificationId}/read`, {}));
    this.notificationsSignal.update((items) =>
      items.map((item) => (item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item)),
    );
  }

  async refreshNotifications(): Promise<void> {
    await this.loadNotifications();
  }

  upsertNotification(notification: Notification): boolean {
    let changed = false;

    this.notificationsSignal.update((items) => {
      const existing = items.find((item) => item.id === notification.id);
      const nextNotification = existing
        ? { ...existing, ...notification, readAt: notification.readAt ?? existing.readAt }
        : notification;

      if (existing && notificationsEqual(existing, nextNotification)) {
        return items;
      }

      changed = true;
      return mergeNotifications(items, [nextNotification]);
    });

    return changed;
  }

  async markAllNotificationsRead(_userId: string): Promise<void> {
    const unreadNotifications = this.notificationsSignal().filter((item) => !item.readAt);
    await Promise.all(unreadNotifications.map((item) => this.markNotificationRead(item.id)));
  }

  async loadActivityForEntity(entityId: string): Promise<void> {
    const activity = await firstValueFrom(
      this.api.get<ActivityEvent[]>(`job-requests/${entityId}/activity`),
    );

    this.activitySignal.update((items) => [
      ...activity,
      ...items.filter((item) => item.entityId !== entityId),
    ]);
  }

  getJobRequestById(id: string): JobRequest | undefined {
    return this.jobRequestsSignal().find((request) => request.id === id);
  }

  getUserName(userId?: string): string {
    if (!userId) {
      return 'Unassigned';
    }

    return (
      this.peopleSignal().find((user) => user.userId === userId)?.displayName ??
      this.auth.users().find((user) => user.userId === userId)?.displayName ??
      'Unknown user'
    );
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

  private async loadJobRequests(): Promise<void> {
    const response = await firstValueFrom(this.api.get<JobRequest[] | { items: JobRequest[] }>('job-requests'));
    const jobRequests = Array.isArray(response) ? response : response.items;
    this.jobRequestsSignal.set(jobRequests);
  }

  private async loadPmoQueue(): Promise<void> {
    const response = await firstValueFrom(this.api.get<PmoQueueItem[] | { items: PmoQueueItem[] }>('pmo/queue'));
    const queueItems = Array.isArray(response) ? response : response.items;

    this.pmoQueueSignal.set(queueItems);
    this.assignmentsSignal.update((existing) => mergeAssignments(existing, queueItems.map((item) => item.assignment)));
    this.jobRequestsSignal.update((existing) => mergeJobRequests(existing, queueItems.map((item) => item.jobRequest)));
  }

  private async loadRecruitmentQueue(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<RecruitmentQueueItem[] | { items: RecruitmentQueueItem[] }>('recruitment/queue'),
      );
      const queueItems = Array.isArray(response) ? response : response.items;

      this.recruitmentQueueSignal.set(queueItems);
      this.assignmentsSignal.update((existing) => mergeAssignments(existing, queueItems.map((item) => item.assignment)));
      this.jobRequestsSignal.update((existing) => mergeJobRequests(existing, queueItems.map((item) => item.jobRequest)));
    } catch {
      this.recruitmentQueueSignal.set([]);
    }
  }

  private async loadNotifications(): Promise<void> {
    const response = await firstValueFrom(this.api.get<Notification[] | { items: Notification[] }>('notifications'));
    this.notificationsSignal.set(Array.isArray(response) ? response : response.items);
  }

  private upsertJobRequest(jobRequest: JobRequest): void {
    this.jobRequestsSignal.update((items) => mergeJobRequests(items, [jobRequest]));
  }
}

function mergeJobRequests(existing: JobRequest[], incoming: JobRequest[]): JobRequest[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values()).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function mergeAssignments(existing: WorkflowAssignment[], incoming: WorkflowAssignment[]): WorkflowAssignment[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values()).sort((first, second) => second.assignedAt.localeCompare(first.assignedAt));
}

function mergeNotifications(existing: Notification[], incoming: Notification[]): Notification[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    const current = byId.get(item.id);
    byId.set(item.id, current ? { ...current, ...item, readAt: item.readAt ?? current.readAt } : item);
  }

  return Array.from(byId.values()).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function notificationsEqual(first: Notification, second: Notification): boolean {
  return (
    first.id === second.id &&
    first.recipientUserId === second.recipientUserId &&
    first.title === second.title &&
    first.message === second.message &&
    first.entityType === second.entityType &&
    first.entityId === second.entityId &&
    first.readAt === second.readAt &&
    first.createdAt === second.createdAt
  );
}
