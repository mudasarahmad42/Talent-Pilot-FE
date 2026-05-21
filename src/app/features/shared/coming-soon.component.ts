import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  imports: [RouterLink],
  template: `
    <main class="placeholder-page">
      <section class="panel placeholder-panel">
        <p class="eyebrow">Later phase</p>
        <h1>Not available in this MVP.</h1>
        <p>
          This route is reserved so the product structure stays clear while the first
          working recruitment slice is developed.
        </p>
        <a class="btn primary" routerLink="/app/dashboard">Back to dashboard</a>
      </section>
    </main>
  `,
})
export class ComingSoonComponent {}
