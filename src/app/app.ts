import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicFeedbackWidgetComponent } from './core/components/public-feedback-widget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PublicFeedbackWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
