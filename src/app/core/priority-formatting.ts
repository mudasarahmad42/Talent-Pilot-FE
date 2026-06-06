import { Priority } from './models';

export function priorityBadgeClass(priority: Priority | string | null | undefined): string {
  const normalized = (priority ?? '').toString().trim().toLowerCase();
  const priorityClassByValue = new Map<string, string>([
    ['low', 'priority-low'],
    ['medium', 'priority-medium'],
    ['high', 'priority-high'],
    ['critical', 'priority-critical'],
  ]);

  return `status-badge priority ${priorityClassByValue.get(normalized) ?? 'priority-medium'}`;
}
