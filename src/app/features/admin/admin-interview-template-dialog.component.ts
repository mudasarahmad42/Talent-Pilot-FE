import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AdminCenterApiService,
  AdminHiringPipelineTemplateDetails,
  AdminUserListItem,
} from '../../core/admin-center-api.service';
import { AdminSettingsApiService } from '../../core/admin-settings-api.service';
import { ConfigurationService } from '../../core/services/configuration.service';
import { NotificationService } from '../../core/services/notification.service';
import { AccessOption } from './models/admin-page.models';

interface EditableTemplateRound {
  interviewTemplateRoundId: string | null;
  name: string;
  ownerRoleId: string | null;
  ownerUserId: string | null;
  durationMinutes: number;
  isRequired: boolean;
  status: string;
}

@Component({
  selector: 'app-admin-interview-template-dialog',
  imports: [MatButtonModule, MatTooltipModule],
  templateUrl: './admin-interview-template-dialog.component.html',
  styleUrl: './admin-interview-template-dialog.component.scss',
})
export class AdminInterviewTemplateDialogComponent {
  private readonly api = inject(AdminCenterApiService);
  private readonly adminSettingsApi = inject(AdminSettingsApiService);
  private readonly configuration = inject(ConfigurationService);
  private readonly notifications = inject(NotificationService);

  readonly templateId = signal('');
  readonly name = signal('');
  readonly departmentId = signal<string | null>(null);
  readonly description = signal('');
  readonly status = signal('Active');
  readonly rounds = signal<EditableTemplateRound[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly interviewerPickerRoundIndex = signal<number | null>(null);
  readonly pickerSearch = signal('');
  readonly pickerDepartmentId = signal('');
  readonly pickerRoleId = signal('');
  readonly pickerMinimumExperience = signal('');
  readonly pickerInterviewCount = signal('');
  readonly companyLabel = computed(() => {
    const tenantName = this.adminSettingsApi.tenantProfile().displayName.trim();
    return tenantName || this.configuration.app.companyName;
  });
  readonly isCreateMode = computed(() => !this.templateId());

  @Input() departments: AccessOption[] = [];
  @Input() interviewers: AdminUserListItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly templateSaved = new EventEmitter<void>();

  @Input() set template(value: AdminHiringPipelineTemplateDetails | null | undefined) {
    this.templateId.set(value?.interviewTemplateId ?? '');
    this.name.set(value?.name ?? '');
    this.departmentId.set(value?.departmentId ?? null);
    this.description.set(value?.description ?? '');
    this.status.set(value?.status ?? 'Active');
    this.rounds.set(
      (value?.rounds ?? []).map((round) => ({
        interviewTemplateRoundId: round.interviewTemplateRoundId || null,
        name: round.name,
        ownerRoleId: round.ownerRoleId ?? null,
        ownerUserId: round.ownerUserId ?? null,
        durationMinutes: round.durationMinutes,
        isRequired: true,
        status: round.status,
      })),
    );
    this.errorMessage.set('');
  }

  setName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.errorMessage.set('');
  }

  setDepartment(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.departmentId.set(value || null);
    this.errorMessage.set('');
  }

  setDescription(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
    this.errorMessage.set('');
  }

  setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.errorMessage.set('');
  }

  addRound(): void {
    this.rounds.update((rounds) => [
      ...rounds,
      {
        interviewTemplateRoundId: null,
        name: '',
        ownerRoleId: null,
        ownerUserId: null,
        durationMinutes: 60,
        isRequired: true,
        status: 'Active',
      },
    ]);
  }

  removeRound(index: number): void {
    this.rounds.update((rounds) => rounds.filter((_, roundIndex) => roundIndex !== index));
    this.errorMessage.set('');
  }

  updateRoundName(index: number, event: Event): void {
    this.updateRound(index, { name: (event.target as HTMLInputElement).value });
  }

  openInterviewerPicker(index: number): void {
    this.interviewerPickerRoundIndex.set(index);
    this.pickerSearch.set('');
    this.pickerDepartmentId.set(this.shouldSuggestHod(index) ? this.departmentId() ?? '' : '');
    this.pickerRoleId.set(this.shouldSuggestHod(index) ? this.hodRoleId() ?? '' : '');
    this.pickerMinimumExperience.set('');
    this.pickerInterviewCount.set('');
  }

  closeInterviewerPicker(): void {
    this.interviewerPickerRoundIndex.set(null);
  }

  selectPickerInterviewer(userId: string): void {
    const roundIndex = this.interviewerPickerRoundIndex();
    if (roundIndex === null) {
      return;
    }

    this.updateRound(roundIndex, { ownerUserId: userId || null });
    this.closeInterviewerPicker();
  }

  clearRoundInterviewer(index: number): void {
    this.updateRound(index, { ownerUserId: null });
  }

  applyRecommendedHod(index: number): void {
    const hod = this.recommendedHodForRound(index);
    if (!hod) {
      return;
    }

    this.updateRound(index, { ownerUserId: hod.id });
  }

  updateRoundDuration(index: number, event: Event): void {
    this.updateRound(index, { durationMinutes: Number((event.target as HTMLInputElement).value) || 0 });
  }

  updateRoundStatus(index: number, event: Event): void {
    this.updateRound(index, { status: (event.target as HTMLSelectElement).value });
  }

  setPickerSearch(event: Event): void {
    this.pickerSearch.set((event.target as HTMLInputElement).value);
  }

  setPickerDepartment(event: Event): void {
    this.pickerDepartmentId.set((event.target as HTMLSelectElement).value);
  }

  setPickerRole(event: Event): void {
    this.pickerRoleId.set((event.target as HTMLSelectElement).value);
  }

  setPickerMinimumExperience(event: Event): void {
    this.pickerMinimumExperience.set((event.target as HTMLSelectElement).value);
  }

  setPickerInterviewCount(event: Event): void {
    this.pickerInterviewCount.set((event.target as HTMLSelectElement).value);
  }

  canSubmit(): boolean {
    const rounds = this.rounds();
    return (
      !this.saving() &&
      this.name().trim().length >= 2 &&
      rounds.length > 0 &&
      rounds.some((round) => round.status === 'Active') &&
      rounds.every((round) => round.name.trim().length >= 2) &&
      rounds.every((round) => round.durationMinutes >= 15 && round.durationMinutes <= 480)
    );
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) {
      this.errorMessage.set('Template name, active rounds, and valid round durations are required.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const input = {
        name: this.name().trim(),
        departmentId: this.departmentId(),
        description: this.description().trim() || null,
        status: this.status(),
        rounds: this.rounds().map((round, index) => ({
          interviewTemplateRoundId: round.interviewTemplateRoundId,
          roundOrder: index + 1,
          name: round.name.trim(),
          ownerRoleId: round.ownerRoleId,
          ownerUserId: round.ownerUserId,
          durationMinutes: round.durationMinutes,
          isRequired: true,
          status: round.status,
        })),
      };

      if (this.isCreateMode()) {
        await this.api.createHiringPipelineTemplate(input);
      } else {
        await this.api.updateHiringPipelineTemplate(this.templateId(), input);
      }

      this.notifications.success(this.isCreateMode() ? 'Interview template created.' : 'Interview template updated.');
      this.templateSaved.emit();
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Interview template could not be updated.');
    } finally {
      this.saving.set(false);
    }
  }

  private updateRound(index: number, patch: Partial<EditableTemplateRound>): void {
    this.rounds.update((rounds) =>
      rounds.map((round, roundIndex) => (roundIndex === index ? { ...round, ...patch } : round)),
    );
    this.errorMessage.set('');
  }

  filteredPickerInterviewers(): AdminUserListItem[] {
    const search = this.pickerSearch().trim().toLowerCase();
    const departmentId = this.pickerDepartmentId();
    const roleId = this.pickerRoleId();
    const minimumExperience = Number(this.pickerMinimumExperience());
    const roundIndex = this.interviewerPickerRoundIndex();

    return this.interviewers
      .filter((interviewer) => this.matchesInterviewer(interviewer, search))
      .filter((interviewer) => !departmentId || interviewer.departmentId === departmentId)
      .filter((interviewer) => !roleId || interviewer.roleIds.includes(roleId))
      .filter(
        (interviewer) =>
          !this.pickerMinimumExperience() ||
          (typeof interviewer.experienceYears === 'number' && interviewer.experienceYears >= minimumExperience),
      )
      .filter((interviewer) => this.matchesInterviewCountFilter(interviewer.completedInterviewCount))
      .sort((left, right) => {
        const leftRecommended = roundIndex !== null && this.isRecommendedHod(left, roundIndex);
        const rightRecommended = roundIndex !== null && this.isRecommendedHod(right, roundIndex);
        if (leftRecommended !== rightRecommended) {
          return leftRecommended ? -1 : 1;
        }

        return left.displayName.localeCompare(right.displayName);
      });
  }

  pickerHasResults(): boolean {
    return this.filteredPickerInterviewers().length > 0;
  }

  pickerRoundName(): string {
    const roundIndex = this.interviewerPickerRoundIndex();
    return roundIndex === null ? '' : (this.rounds()[roundIndex]?.name || `Round ${roundIndex + 1}`);
  }

  isPickerSelection(userId: string): boolean {
    const roundIndex = this.interviewerPickerRoundIndex();
    return roundIndex !== null && this.rounds()[roundIndex]?.ownerUserId === userId;
  }

  pickerDepartmentOptions(): AccessOption[] {
    const seen = new Set<string>();
    return this.interviewers
      .filter((interviewer) => Boolean(interviewer.departmentId && interviewer.departmentName))
      .filter((interviewer) => {
        if (!interviewer.departmentId || seen.has(interviewer.departmentId)) {
          return false;
        }

        seen.add(interviewer.departmentId);
        return true;
      })
      .map((interviewer) => ({ id: interviewer.departmentId as string, name: interviewer.departmentName as string }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  pickerRoleOptions(): AccessOption[] {
    const roles = new Map<string, string>();
    for (const interviewer of this.interviewers) {
      interviewer.roleIds.forEach((roleId, index) => {
        const roleName = interviewer.roleNames[index];
        if (roleName && !roles.has(roleId)) {
          roles.set(roleId, roleName);
        }
      });
    }

    return Array.from(roles, ([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name));
  }

  selectedInterviewerName(ownerUserId: string | null): string {
    return this.findInterviewer(ownerUserId)?.displayName ?? 'No default interviewer selected';
  }

  selectedInterviewerContext(ownerUserId: string | null): string {
    const interviewer = this.findInterviewer(ownerUserId);
    return interviewer
      ? `${interviewer.highestPriorityRoleName || 'User'} - ${interviewer.departmentName || 'No department'}`
      : 'Choose a default person for this interview round.';
  }

  selectedInterviewerSummary(ownerUserId: string | null): string {
    const interviewer = this.findInterviewer(ownerUserId);
    return interviewer
      ? `${interviewer.email} - ${interviewer.roleNames.join(', ') || 'No role'}`
      : 'Recruiters can override the default person when preparing a job post.';
  }

  shouldSuggestHod(index: number): boolean {
    const round = this.rounds()[index];
    if (!round) {
      return false;
    }

    const name = round.name.toLowerCase();
    return index === this.rounds().length - 1 || name.includes('hod') || name.includes('department head') || name.includes('final');
  }

  recommendedHodForRound(index: number): AdminUserListItem | undefined {
    if (!this.shouldSuggestHod(index)) {
      return undefined;
    }

    const departmentId = this.departmentId();
    if (!departmentId) {
      return undefined;
    }

    return this.interviewers
      .filter((interviewer) => this.isHodUser(interviewer))
      .filter((interviewer) => interviewer.departmentId === departmentId)
      .sort((left, right) => {
        const interviewCountDelta = right.completedInterviewCount - left.completedInterviewCount;
        return interviewCountDelta !== 0 ? interviewCountDelta : left.displayName.localeCompare(right.displayName);
      })[0];
  }

  hodRecommendationMessage(index: number): string {
    if (!this.shouldSuggestHod(index)) {
      return '';
    }

    const departmentName = this.templateDepartmentName();
    if (!departmentName) {
      return 'Choose a department to let Talent Pilot recommend that department HOD for the final interview.';
    }

    const hod = this.recommendedHodForRound(index);
    return hod
      ? `Recommended HOD for ${departmentName}: ${hod.displayName}`
      : `No active HOD is configured for ${departmentName}. Add a department HOD user to make this default easier.`;
  }

  canApplyRecommendedHod(index: number, ownerUserId: string | null): boolean {
    const hod = this.recommendedHodForRound(index);
    return Boolean(hod && hod.id !== ownerUserId);
  }

  isRecommendedHod(interviewer: AdminUserListItem, roundIndex: number): boolean {
    return this.recommendedHodForRound(roundIndex)?.id === interviewer.id;
  }

  interviewerCardMeta(interviewer: AdminUserListItem): string {
    return [
      interviewer.highestPriorityRoleName || 'User',
      interviewer.departmentName || 'No department',
      this.formatExperience(interviewer.experienceYears),
      `${interviewer.completedInterviewCount} interviews`,
    ].join(' - ');
  }

  formatJoiningDate(joiningDate: string | null | undefined): string {
    const date = this.parseDateOnly(joiningDate);
    return date
      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
      : 'Not recorded';
  }

  formatTimeAtCompany(joiningDate: string | null | undefined): string {
    const start = this.parseDateOnly(joiningDate);
    if (!start) {
      return 'Not recorded';
    }

    const today = new Date();
    let months = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
    if (today.getDate() < start.getDate()) {
      months -= 1;
    }

    if (months < 1) {
      return 'Less than 1 month';
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const parts: string[] = [];
    if (years > 0) {
      parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    }

    if (remainingMonths > 0) {
      parts.push(`${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`);
    }

    return parts.join(' ');
  }

  formatLastActive(lastActiveAt: string | null | undefined): string {
    if (!lastActiveAt) {
      return 'Not recorded';
    }

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(lastActiveAt),
    );
  }

  private matchesInterviewer(interviewer: AdminUserListItem, search: string): boolean {
    if (!search) {
      return true;
    }

    const haystack = [
      interviewer.displayName,
      interviewer.email,
      interviewer.departmentName ?? '',
      interviewer.highestPriorityRoleName,
      this.formatExperience(interviewer.experienceYears),
      interviewer.joiningDate ?? '',
      String(interviewer.completedInterviewCount),
      ...interviewer.roleNames,
      ...interviewer.groupNames,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  }

  private matchesInterviewCountFilter(completedInterviewCount: number): boolean {
    switch (this.pickerInterviewCount()) {
      case '0':
        return completedInterviewCount === 0;
      case '1-5':
        return completedInterviewCount >= 1 && completedInterviewCount <= 5;
      case '6-15':
        return completedInterviewCount >= 6 && completedInterviewCount <= 15;
      case '16+':
        return completedInterviewCount >= 16;
      default:
        return true;
    }
  }

  private findInterviewer(userId: string | null | undefined): AdminUserListItem | undefined {
    return userId ? this.interviewers.find((interviewer) => interviewer.id === userId) : undefined;
  }

  private isHodUser(interviewer: AdminUserListItem): boolean {
    return interviewer.roleNames.some((role) => {
      const normalizedRole = role.toLowerCase();
      return normalizedRole === 'hod' || normalizedRole.includes('department head');
    });
  }

  private hodRoleId(): string | null {
    return this.pickerRoleOptions().find((role) => {
      const normalizedRole = role.name.toLowerCase();
      return normalizedRole === 'hod' || normalizedRole.includes('department head');
    })?.id ?? null;
  }

  private templateDepartmentName(): string {
    const selectedDepartmentId = this.departmentId();
    return selectedDepartmentId ? this.departments.find((department) => department.id === selectedDepartmentId)?.name ?? '' : '';
  }

  private formatExperience(experienceYears: number | null | undefined): string {
    return typeof experienceYears === 'number' ? `${experienceYears.toFixed(1)} yrs` : 'exp unknown';
  }

  private parseDateOnly(value: string | null | undefined): Date | null {
    return value ? new Date(`${value}T00:00:00`) : null;
  }
}
