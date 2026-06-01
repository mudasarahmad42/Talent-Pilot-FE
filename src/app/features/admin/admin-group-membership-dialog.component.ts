import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AdminCenterApiService,
  AdminGroupMembershipResponse,
  AdminGroupMembershipUser,
  BulkGroupMembershipSelection,
  GroupMembershipFilter,
} from '../../core/admin-center-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AdminGroupMembershipDialogContext } from './models/admin-page.models';

@Component({
  selector: 'app-admin-group-membership-dialog',
  imports: [MatButtonModule, MatTooltipModule],
  templateUrl: './admin-group-membership-dialog.component.html',
  styleUrl: './admin-group-membership-dialog.component.scss',
})
export class AdminGroupMembershipDialogComponent {
  private readonly api = inject(AdminCenterApiService);
  private readonly notifications = inject(NotificationService);

  readonly membershipFilters: GroupMembershipFilter[] = ['Members', 'Available', 'All'];
  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly context = signal<AdminGroupMembershipDialogContext | null>(null);
  readonly response = signal<AdminGroupMembershipResponse | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly search = signal('');
  readonly membershipFilter = signal<GroupMembershipFilter>('Members');
  readonly page = signal(1);
  readonly pageSize = signal(5);
  readonly userIdsToAdd = signal<ReadonlySet<string>>(new Set());
  readonly userIdsToRemove = signal<ReadonlySet<string>>(new Set());
  readonly bulkSelection = signal<BulkGroupMembershipSelection | null>(null);
  readonly pendingAddCount = computed(() => this.userIdsToAdd().size + this.bulkAddCount());
  readonly pendingRemoveCount = computed(() => this.userIdsToRemove().size + this.bulkRemoveCount());
  readonly pendingChangeCount = computed(() => this.pendingAddCount() + this.pendingRemoveCount());

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly membershipChanged = new EventEmitter<void>();

  @Input({ required: true })
  set group(value: AdminGroupMembershipDialogContext | null) {
    if (!value) {
      return;
    }

    if (this.context()?.groupId === value.groupId) {
      return;
    }

    this.context.set(value);
    this.search.set('');
    this.membershipFilter.set('Members');
    this.page.set(1);
    this.clearPendingChanges();
    void this.loadMembership();
  }

  items(): AdminGroupMembershipUser[] {
    return this.response()?.items ?? [];
  }

  isSelectedMember(user: AdminGroupMembershipUser): boolean {
    if (this.userIdsToAdd().has(user.userId)) {
      return true;
    }

    if (this.userIdsToRemove().has(user.userId)) {
      return false;
    }

    return user.isMember;
  }

  hasPendingChange(user: AdminGroupMembershipUser): boolean {
    return this.userIdsToAdd().has(user.userId) || this.userIdsToRemove().has(user.userId);
  }

  canToggleUser(user: AdminGroupMembershipUser): boolean {
    return user.isMember || user.accountStatus !== 'Disabled';
  }

  selectAllChecked(): boolean {
    const bulkSelection = this.bulkSelection();
    if (bulkSelection) {
      return bulkSelection.mode === 'AddMatching';
    }

    if (this.membershipFilter() === 'Members') {
      return this.matchingFilterCount() > 0;
    }

    if (this.membershipFilter() === 'All') {
      return this.matchingFilterCount() > 0 && this.filteredAvailableCount() === 0;
    }

    return false;
  }

  toggleUserMembership(user: AdminGroupMembershipUser, event: Event): void {
    this.bulkSelection.set(null);
    this.setUserMembership(user, (event.target as HTMLInputElement).checked);
  }

  toggleFilteredMembership(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const pendingCount = checked ? this.filteredAvailableCount() : this.filteredMemberCount();

    this.userIdsToAdd.set(new Set());
    this.userIdsToRemove.set(new Set());

    if (pendingCount === 0) {
      this.bulkSelection.set(null);
      return;
    }

    this.bulkSelection.set({
      mode: checked ? 'AddMatching' : 'RemoveMatching',
      search: this.search().trim() || null,
      membership: this.membershipFilter(),
    });
  }

  matchingFilterCount(): number {
    if (this.membershipFilter() === 'Members') {
      return this.filteredMemberCount();
    }

    if (this.membershipFilter() === 'Available') {
      return this.filteredAvailableCount();
    }

    return this.filteredMemberCount() + this.filteredAvailableCount();
  }

  bulkSelectionCopy(): string {
    const bulkSelection = this.bulkSelection();
    if (!bulkSelection) {
      return `Selects all ${this.matchingFilterCount()} users matching the current filter across all pages.`;
    }

    const action = bulkSelection.mode === 'AddMatching' ? 'add' : 'remove';
    const count = bulkSelection.mode === 'AddMatching' ? this.bulkAddCount() : this.bulkRemoveCount();
    return `Will ${action} ${count} users matching the current filter across all pages.`;
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    this.clearPendingChanges();
    void this.loadMembership();
  }

  setMembershipFilter(filter: GroupMembershipFilter): void {
    if (this.membershipFilter() === filter) {
      return;
    }

    this.membershipFilter.set(filter);
    this.page.set(1);
    this.clearPendingChanges();
    void this.loadMembership();
  }

  setPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value) || 5);
    this.page.set(1);
    void this.loadMembership();
  }

  goToPage(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.totalPages());
    if (nextPage === this.page()) {
      return;
    }

    this.page.set(nextPage);
    void this.loadMembership();
  }

  canGoPrevious(): boolean {
    return this.page() > 1;
  }

  canGoNext(): boolean {
    return this.page() < this.totalPages();
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, index) => index + 1);
  }

  listRangeLabel(): string {
    const total = this.response()?.totalCount ?? 0;
    if (total === 0) {
      return 'No users found';
    }

    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(total, this.page() * this.pageSize());
    return `Showing ${start}-${end} of ${total} users`;
  }

  clearPendingChanges(): void {
    this.userIdsToAdd.set(new Set());
    this.userIdsToRemove.set(new Set());
    this.bulkSelection.set(null);
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  async save(): Promise<void> {
    const context = this.context();
    if (!context || this.pendingChangeCount() === 0) {
      return;
    }

    this.saving.set(true);
    try {
      const result = await this.api.updateGroupMembers(context.groupId, {
        userIdsToAdd: [...this.userIdsToAdd()],
        userIdsToRemove: [...this.userIdsToRemove()],
        bulkSelection: this.bulkSelection(),
      });
      this.clearPendingChanges();
      this.notifications.success(
        `Group membership saved. Added ${result.addedCount}, removed ${result.removedCount}.`,
      );
      this.membershipChanged.emit();
      await this.loadMembership();
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Group membership could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  private setUserMembership(user: AdminGroupMembershipUser, shouldBeMember: boolean): void {
    if (shouldBeMember === user.isMember) {
      this.userIdsToAdd.update((ids) => {
        const next = new Set(ids);
        next.delete(user.userId);
        return next;
      });
      this.userIdsToRemove.update((ids) => {
        const next = new Set(ids);
        next.delete(user.userId);
        return next;
      });
      return;
    }

    if (shouldBeMember) {
      this.userIdsToAdd.update((ids) => new Set(ids).add(user.userId));
      this.userIdsToRemove.update((ids) => {
        const next = new Set(ids);
        next.delete(user.userId);
        return next;
      });
      return;
    }

    this.userIdsToRemove.update((ids) => new Set(ids).add(user.userId));
    this.userIdsToAdd.update((ids) => {
      const next = new Set(ids);
      next.delete(user.userId);
      return next;
    });
  }

  private async loadMembership(): Promise<void> {
    const context = this.context();
    if (!context) {
      return;
    }

    this.loading.set(true);
    try {
      const response = await this.api.listGroupMembership(context.groupId, {
        search: this.search(),
        membership: this.membershipFilter(),
        page: this.page(),
        pageSize: this.pageSize(),
      });
      this.response.set(response);
      this.context.update((current) =>
        current
          ? {
              ...current,
              memberCount: response.summary.memberCount,
              status: response.group.status,
            }
          : current,
      );
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Group membership could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  private filteredMemberCount(): number {
    return this.response()?.summary.filteredMemberCount ?? 0;
  }

  private filteredAvailableCount(): number {
    return this.response()?.summary.filteredAvailableUserCount ?? 0;
  }

  private bulkAddCount(): number {
    const bulkSelection = this.bulkSelection();
    return bulkSelection?.mode === 'AddMatching' ? this.filteredAvailableCount() : 0;
  }

  private bulkRemoveCount(): number {
    const bulkSelection = this.bulkSelection();
    return bulkSelection?.mode === 'RemoveMatching' ? this.filteredMemberCount() : 0;
  }

  private totalPages(): number {
    return Math.max(1, Math.ceil((this.response()?.totalCount ?? 0) / this.pageSize()));
  }
}
