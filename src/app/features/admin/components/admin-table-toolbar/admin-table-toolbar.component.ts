import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-admin-table-toolbar',
  templateUrl: './admin-table-toolbar.component.html',
  styleUrl: './admin-table-toolbar.component.scss',
})
export class AdminTableToolbarComponent {
  @Input() search = '';
  @Input() searchPlaceholder = 'Search';
  @Input() searchAriaLabel = 'Search';
  @Input() pageSize = 5;
  @Input() pageSizeOptions: readonly number[] = [5, 10, 25, 50];
  @Input() pageSizeAriaLabel = 'Rows per page';
  @Input() status = '';
  @Input() statusOptions: readonly AdminTableToolbarStatusOption[] = [];
  @Input() statusLabel = 'Status';
  @Input() statusAriaLabel = 'Status filter';

  @Output() readonly searchChange = new EventEmitter<string>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();
  @Output() readonly statusChange = new EventEmitter<string>();

  setSearch(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  setPageSize(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }

  setStatus(event: Event): void {
    this.statusChange.emit((event.target as HTMLSelectElement).value);
  }
}

export interface AdminTableToolbarStatusOption {
  value: string;
  label: string;
}
