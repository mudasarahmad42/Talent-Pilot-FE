import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AdminCenterApiService } from '../../core/admin-center-api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-create-department-dialog',
  imports: [MatButtonModule],
  templateUrl: './admin-create-department-dialog.component.html',
  styleUrl: './admin-create-department-dialog.component.scss',
})
export class AdminCreateDepartmentDialogComponent {
  private readonly api = inject(AdminCenterApiService);
  private readonly notifications = inject(NotificationService);

  readonly name = signal('');
  readonly code = signal('');
  readonly status = signal('Active');
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  private readonly codeEdited = signal(false);

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly departmentCreated = new EventEmitter<void>();

  setName(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.name.set(value);
    if (!this.codeEdited()) {
      this.code.set(this.toDepartmentCode(value));
    }
    this.errorMessage.set('');
  }

  setCode(event: Event): void {
    this.codeEdited.set(true);
    this.code.set(this.toDepartmentCode((event.target as HTMLInputElement).value));
    this.errorMessage.set('');
  }

  setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.errorMessage.set('');
  }

  canSubmit(): boolean {
    return !this.saving() && this.name().trim().length >= 2 && this.code().trim().length >= 2;
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) {
      this.errorMessage.set('Department name and code must be at least 2 characters.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const department = await this.api.createDepartment({
        code: this.code().trim(),
        name: this.name().trim(),
        status: this.status(),
      });
      this.notifications.success(`${department.name} department added.`);
      this.departmentCreated.emit();
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Department could not be added.');
    } finally {
      this.saving.set(false);
    }
  }

  private toDepartmentCode(value: string): string {
    const code = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);

    return code;
  }
}
