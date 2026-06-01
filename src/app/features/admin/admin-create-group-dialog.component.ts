import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AdminCenterApiService } from '../../core/admin-center-api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-create-group-dialog',
  imports: [MatButtonModule],
  templateUrl: './admin-create-group-dialog.component.html',
  styleUrl: './admin-create-group-dialog.component.scss',
})
export class AdminCreateGroupDialogComponent {
  private readonly api = inject(AdminCenterApiService);
  private readonly notifications = inject(NotificationService);

  readonly name = signal('');
  readonly purpose = signal('WorkflowRouting');
  readonly status = signal('Active');
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly groupCreated = new EventEmitter<void>();

  setName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.errorMessage.set('');
  }

  setPurpose(event: Event): void {
    this.purpose.set((event.target as HTMLSelectElement).value);
    this.errorMessage.set('');
  }

  setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.errorMessage.set('');
  }

  canSubmit(): boolean {
    return !this.saving() && this.name().trim().length >= 2 && Boolean(this.purpose().trim());
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) {
      this.errorMessage.set('Group name must be at least 2 characters.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const group = await this.api.createGroup({
        name: this.name().trim(),
        purpose: this.purpose(),
        status: this.status(),
      });
      this.notifications.success(`${group.name} group created.`);
      this.groupCreated.emit();
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Group could not be created.');
    } finally {
      this.saving.set(false);
    }
  }
}
