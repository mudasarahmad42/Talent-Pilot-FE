import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AdminPaginationVariant = 'admin' | 'users';

@Component({
  selector: 'app-admin-pagination',
  templateUrl: './admin-pagination.component.html',
  styleUrl: './admin-pagination.component.scss',
})
export class AdminPaginationComponent {
  @Input() rangeLabel = '';
  @Input() pageNumbers: readonly number[] = [];
  @Input() currentPage = 1;
  @Input() canGoPrevious = false;
  @Input() canGoNext = false;
  @Input() variant: AdminPaginationVariant = 'admin';

  @Output() readonly pageChange = new EventEmitter<number>();
}
