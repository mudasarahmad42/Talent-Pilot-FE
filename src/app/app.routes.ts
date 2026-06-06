import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { candidateGuard } from './core/candidate.guard';
import { internalAppGuard } from './core/internal-app.guard';
import { permissionGuard } from './core/permission.guard';
import { Permission } from './core/permissions';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((component) => component.LoginComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard, internalAppGuard],
    loadComponent: () => import('./features/shell/app-shell.component').then((component) => component.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/internal/dashboard.component').then((component) => component.DashboardComponent),
      },
      {
        path: 'my-work',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ViewJobRequests, Permission.ClaimWorkflowTasks] },
        loadComponent: () => import('./features/internal/my-work.component').then((component) => component.MyWorkComponent),
      },
      {
        path: 'job-requests',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ViewJobRequests, Permission.CreateJobRequests] },
        loadComponent: () =>
          import('./features/internal/job-requests.component').then((component) => component.JobRequestsComponent),
      },
      {
        path: 'job-requests/new',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.CreateJobRequests] },
        loadComponent: () =>
          import('./features/internal/create-job-request.component').then(
            (component) => component.CreateJobRequestComponent,
          ),
      },
      {
        path: 'job-requests/:id',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ViewJobRequests, Permission.CreateJobRequests] },
        loadComponent: () =>
          import('./features/internal/job-request-detail.component').then(
            (component) => component.JobRequestDetailComponent,
          ),
      },
      {
        path: 'pmo/queue',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ClaimWorkflowTasks] },
        loadComponent: () =>
          import('./features/internal/pmo-queue.component').then((component) => component.PmoQueueComponent),
      },
      {
        path: 'pmo/review/:jobRequestId',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ClaimWorkflowTasks] },
        loadComponent: () =>
          import('./features/internal/pmo-review.component').then((component) => component.PmoReviewComponent),
      },
      { path: 'notifications', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'bench-matching/:jobRequestId',
        redirectTo: 'pmo/review/:jobRequestId',
      },
      {
        path: 'recruitment/queue',
        canActivate: [permissionGuard],
        data: { screenId: 'recruitment-queue', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/recruitment-queue.component').then(
            (component) => component.RecruitmentQueueComponent,
          ),
      },
      {
        path: 'recruitment/talent-rediscovery',
        canActivate: [permissionGuard],
        data: { screenId: 'candidate-rediscovery', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/candidate-rediscovery.component').then(
            (component) => component.CandidateRediscoveryComponent,
          ),
      },
      {
        path: 'recruitment/sourcing/:jobRequestId',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/recruiter-sourcing.component').then(
            (component) => component.RecruiterSourcingComponent,
          ),
      },
      {
        path: 'recruitment/applications/:jobApplicationId/history',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/historical-application-detail.component').then(
            (component) => component.HistoricalApplicationDetailComponent,
          ),
      },
      {
        path: 'recruitment/candidates/:candidateId/profile',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/candidate-profile.component').then(
            (component) => component.CandidateProfileComponent,
          ),
      },
      {
        path: 'job-publishing',
        canActivate: [permissionGuard],
        data: { screenId: 'job-publishing', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/job-publishing.component').then((component) => component.JobPublishingComponent),
      },
      {
        path: 'candidates',
        canActivate: [permissionGuard],
        data: { screenId: 'candidates', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/candidates.component').then((component) => component.CandidatesComponent),
      },
      {
        path: 'candidates/new',
        redirectTo: 'candidates',
      },
      {
        path: 'prospect-invite',
        redirectTo: 'recruitment/talent-rediscovery',
      },
      {
        path: 'candidates/:id',
        redirectTo: 'recruitment/candidates/:id/profile',
      },
      {
        path: 'candidate-pipeline',
        canActivate: [permissionGuard],
        data: { screenId: 'candidate-pipeline', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/candidate-pipeline.component').then(
            (component) => component.CandidatePipelineComponent,
          ),
      },
      {
        path: 'interview-scheduling',
        canActivate: [permissionGuard],
        data: { screenId: 'interview-scheduling', requiredAnyPermissions: [Permission.ManageInterviews] },
        loadComponent: () =>
          import('./features/internal/interview-scheduling.component').then(
            (component) => component.InterviewSchedulingComponent,
          ),
      },
      {
        path: 'interview-feedback',
        canActivate: [permissionGuard],
        data: {
          screenId: 'interview-feedback',
          requiredAnyPermissions: [Permission.ManageInterviews, Permission.ManageCandidates, Permission.ManageHiringDecisions],
        },
        loadComponent: () =>
          import('./features/internal/interview-feedback.component').then(
            (component) => component.InterviewFeedbackComponent,
          ),
      },
      {
        path: 'hiring-manager/reviews',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ManageHiringDecisions] },
        loadComponent: () =>
          import('./features/internal/hiring-manager-review.component').then(
            (component) => component.HiringManagerReviewComponent,
          ),
      },
      {
        path: 'hiring-manager/reviews/:jobApplicationId',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ManageHiringDecisions] },
        loadComponent: () =>
          import('./features/internal/hiring-manager-review.component').then(
            (component) => component.HiringManagerReviewComponent,
          ),
      },
      {
        path: 'offer-onboarding',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ManageHiringDecisions] },
        loadComponent: () =>
          import('./features/internal/hiring-manager-review.component').then(
            (component) => component.HiringManagerReviewComponent,
          ),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard],
        data: { requiredAnyPermissions: [Permission.ManageAdminCenter] },
        loadComponent: () =>
          import('./features/internal/reports.component').then((component) => component.ReportsComponent),
      },
    ],
  },
  {
    path: 'admin-center',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-shell.component').then((component) => component.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tenant-profile' },
      { path: 'branding', pathMatch: 'full', redirectTo: 'tenant-profile' },
      { path: 'career-page', pathMatch: 'full', redirectTo: 'tenant-profile' },
      {
        path: ':pageId',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/admin/admin-page.component').then((component) => component.AdminPageComponent),
      },
    ],
  },
  {
    path: 'candidate',
    loadComponent: () =>
      import('./features/candidate/candidate-shell.component').then((component) => component.CandidateShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'jobs' },
      {
        path: 'jobs',
        data: { pageId: 'jobs' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'jobs/:id',
        data: { pageId: 'job-detail' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./features/candidate/candidate-signup.component').then(
            (component) => component.CandidateSignupComponent,
          ),
      },
      {
        path: 'apply/:jobId',
        canActivate: [candidateGuard],
        data: { pageId: 'apply' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: ':tenantSlug/jobs',
        data: { pageId: 'jobs' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: ':tenantSlug/jobs/:id',
        data: { pageId: 'job-detail' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: ':tenantSlug/signup',
        loadComponent: () =>
          import('./features/candidate/candidate-signup.component').then(
            (component) => component.CandidateSignupComponent,
          ),
      },
      {
        path: ':tenantSlug/apply/:jobId',
        canActivate: [candidateGuard],
        data: { pageId: 'apply' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'invite-registration',
        canActivate: [candidateGuard],
        data: { pageId: 'invite-registration' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'confirm-application',
        canActivate: [candidateGuard],
        data: { pageId: 'confirm-application' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'profile',
        canActivate: [candidateGuard],
        data: { pageId: 'profile' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: ':tenantSlug/profile',
        canActivate: [candidateGuard],
        data: { pageId: 'profile' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'my-applications',
        canActivate: [candidateGuard],
        data: { pageId: 'my-applications' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: ':tenantSlug/my-applications',
        canActivate: [candidateGuard],
        data: { pageId: 'my-applications' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'applications/:id/status',
        canActivate: [candidateGuard],
        data: { pageId: 'application-status' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: ':tenantSlug/applications/:id/status',
        canActivate: [candidateGuard],
        data: { pageId: 'application-status' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'interviews',
        canActivate: [candidateGuard],
        data: { pageId: 'interviews' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: ':tenantSlug/interviews',
        canActivate: [candidateGuard],
        data: { pageId: 'interviews' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'reapply-blocked',
        canActivate: [candidateGuard],
        data: { pageId: 'reapply-blocked' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
    ],
  },
  {
    path: 'settings/integrations/google-calendar/success',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/google-calendar-connection-result.component').then(
        (component) => component.GoogleCalendarConnectionResultComponent,
      ),
  },
  {
    path: 'settings/integrations/google-calendar/error',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/google-calendar-connection-result.component').then(
        (component) => component.GoogleCalendarConnectionResultComponent,
      ),
  },
  { path: '**', redirectTo: 'auth/login' },
];
