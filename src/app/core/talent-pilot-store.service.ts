import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ActivityEvent,
  CreateJobRequestInput,
  CreateJobRequestResult,
  JobRequest,
  Notification,
  OperationsPerson,
  OperationsSnapshot,
  WorkflowAssignment,
} from './models';
import { ApiService } from './services/api.service';

@Injectable({ providedIn: 'root' })
export class TalentPilotStoreService {
  private readonly api = inject(ApiService);

  private readonly peopleSignal = signal<OperationsPerson[]>([]);
  private readonly jobRequestsSignal = signal<JobRequest[]>([]);
  private readonly assignmentsSignal = signal<WorkflowAssignment[]>([]);
  private readonly notificationsSignal = signal<Notification[]>([]);
  private readonly activitySignal = signal<ActivityEvent[]>([]);
  private readonly loadingSignal = signal(false);

  readonly people = this.peopleSignal.asReadonly();
  readonly jobRequests = this.jobRequestsSignal.asReadonly();
  readonly assignments = this.assignmentsSignal.asReadonly();
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly activity = this.activitySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  readonly openJobRequests = computed(() =>
    this.jobRequestsSignal().filter((request) => request.stage !== 'Closed'),
  );

  readonly pmoQueue = computed(() =>
    this.assignmentsSignal()
      .filter((assignment) => assignment.assignedToGroupId === 'PMO Group')
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

  constructor() {
    void this.refreshSnapshot();
  }

  async refreshSnapshot(): Promise<void> {
    this.loadingSignal.set(true);

    try {
      const snapshot = await firstValueFrom(this.api.get<OperationsSnapshot>('talent-pilot/snapshot'));
      this.peopleSignal.set(snapshot.people);
      this.jobRequestsSignal.set(snapshot.jobRequests);
      this.assignmentsSignal.set(snapshot.assignments);
      this.notificationsSignal.set(snapshot.notifications);
    } finally {
      this.loadingSignal.set(false);
    }
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

  async claimAssignment(assignmentId: string): Promise<void> {
    await firstValueFrom(this.api.post<void, Record<string, never>>(`talent-pilot/workflow-assignments/${assignmentId}/claim`, {}));
    await this.refreshSnapshot();
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
}
