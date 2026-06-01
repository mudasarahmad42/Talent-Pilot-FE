import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AdminCenterApiService, AdminSkillListItem } from '../../core/admin-center-api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-create-skill-dialog',
  imports: [MatButtonModule],
  templateUrl: './admin-create-skill-dialog.component.html',
  styleUrl: './admin-create-skill-dialog.component.scss',
})
export class AdminCreateSkillDialogComponent {
  private readonly api = inject(AdminCenterApiService);
  private readonly notifications = inject(NotificationService);

  readonly name = signal('');
  readonly category = signal('');
  readonly aliasesText = signal('');
  readonly status = signal('Active');
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly skillId = signal<string | null>(null);

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly skillCreated = new EventEmitter<void>();
  @Output() readonly skillSaved = new EventEmitter<void>();

  @Input() set skill(value: AdminSkillListItem | null | undefined) {
    this.skillId.set(value?.skillId ?? null);
    this.name.set(value?.name ?? '');
    this.category.set(value?.category ?? '');
    this.aliasesText.set(value?.aliases.join(', ') ?? '');
    this.status.set(value?.status ?? 'Active');
    this.errorMessage.set('');
  }

  setName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.errorMessage.set('');
  }

  setCategory(event: Event): void {
    this.category.set((event.target as HTMLInputElement).value);
    this.errorMessage.set('');
  }

  setAliasesText(event: Event): void {
    this.aliasesText.set((event.target as HTMLTextAreaElement).value);
    this.errorMessage.set('');
  }

  setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.errorMessage.set('');
  }

  canSubmit(): boolean {
    return !this.saving() && this.name().trim().length >= 2 && this.category().trim().length >= 2;
  }

  title(): string {
    return this.skillId() ? 'Edit Skill' : 'Add Skill';
  }

  closeLabel(): string {
    return this.skillId() ? 'Close edit skill' : 'Close add skill';
  }

  primaryButtonLabel(): string {
    if (this.saving()) {
      return this.skillId() ? 'Saving...' : 'Adding...';
    }

    return this.skillId() ? 'Save Skill' : 'Add Skill';
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) {
      this.errorMessage.set('Skill name and category must be at least 2 characters.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const input = {
        name: this.name().trim(),
        category: this.category().trim(),
        aliases: this.aliases(),
        status: this.status(),
      };
      const skillId = this.skillId();
      const skill = skillId ? await this.api.updateSkill(skillId, input) : await this.api.createSkill(input);

      this.notifications.success(`${skill.name} skill ${skillId ? 'updated' : 'added'}.`);
      if (!skillId) {
        this.skillCreated.emit();
      }
      this.skillSaved.emit();
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Skill could not be added.');
    } finally {
      this.saving.set(false);
    }
  }

  private aliases(): string[] {
    return this.aliasesText()
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean);
  }
}
