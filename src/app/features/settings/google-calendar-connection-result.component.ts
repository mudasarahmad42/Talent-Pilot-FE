import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-google-calendar-connection-result',
  imports: [RouterLink],
  template: `
    <main class="calendar-connection-result-page">
      <section class="calendar-connection-result-card" [class.error]="isError()">
        <span class="material-symbols-outlined" aria-hidden="true">{{ isError() ? 'error' : 'event_available' }}</span>
        <div>
          <p class="eyebrow">Google Calendar</p>
          <h1>{{ isError() ? 'Connection failed' : 'Calendar connected' }}</h1>
          <p>{{ message() }}</p>
          <a class="btn primary" routerLink="/admin-center/integrations">Back to Integrations</a>
        </div>
      </section>
    </main>
  `,
})
export class GoogleCalendarConnectionResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeMessage = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('message'))),
    { initialValue: null },
  );

  readonly isError = computed(() => this.route.snapshot.routeConfig?.path?.endsWith('error') === true);
  readonly message = computed(() =>
    this.routeMessage() ??
    (this.isError()
      ? 'Google Calendar could not be connected.'
      : 'Talent Pilot can now create interview calendar events from the connected organizer account.'),
  );
}
