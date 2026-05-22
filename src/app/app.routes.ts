import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { candidateGuard } from './core/candidate.guard';
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
    canActivate: [authGuard],
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
        path: 'notifications',
        loadComponent: () =>
          import('./features/internal/notifications.component').then((component) => component.NotificationsComponent),
      },
      {
        path: 'bench-matching/:jobRequestId',
        canActivate: [permissionGuard],
        data: { screenId: 'bench-matching', requiredAnyPermissions: [Permission.ViewBenchMatches] },
        loadComponent: () =>
          import('./features/internal/bench-matching.component').then((component) => component.BenchMatchingComponent),
      },
      {
        path: 'internal-resource-referral',
        data: { screenId: 'internal-resource-referral' },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'presales-resource-review',
        data: { screenId: 'presales-resource-review' },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
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
        path: 'job-publishing',
        canActivate: [permissionGuard],
        data: { screenId: 'job-publishing', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'candidates',
        canActivate: [permissionGuard],
        data: { screenId: 'candidates', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'candidates/new',
        canActivate: [permissionGuard],
        data: { screenId: 'manual-candidate-add', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'prospect-invite',
        canActivate: [permissionGuard],
        data: { screenId: 'prospect-invite', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'candidates/:id',
        canActivate: [permissionGuard],
        data: { screenId: 'candidate-profile-details', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'candidate-pipeline',
        canActivate: [permissionGuard],
        data: { screenId: 'candidate-pipeline', requiredAnyPermissions: [Permission.ManageCandidates] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'interview-scheduling',
        canActivate: [permissionGuard],
        data: { screenId: 'interview-scheduling', requiredAnyPermissions: [Permission.ManageInterviews] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'interview-feedback',
        canActivate: [permissionGuard],
        data: { screenId: 'interview-feedback', requiredAnyPermissions: [Permission.ManageInterviews] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'hiring-manager/reviews',
        canActivate: [permissionGuard],
        data: { screenId: 'hiring-manager-review', requiredAnyPermissions: [Permission.ManageHiringDecisions] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'offer-onboarding',
        canActivate: [permissionGuard],
        data: { screenId: 'offer-onboarding', requiredAnyPermissions: [Permission.ManageHiringDecisions] },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
      },
      {
        path: 'reports',
        data: { screenId: 'reports' },
        loadComponent: () =>
          import('./features/internal/internal-screen.component').then((component) => component.InternalScreenComponent),
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
    canActivate: [candidateGuard],
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
        path: 'apply/:jobId',
        data: { pageId: 'apply' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'invite-registration',
        data: { pageId: 'invite-registration' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'confirm-application',
        data: { pageId: 'confirm-application' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'profile',
        data: { pageId: 'profile' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'my-applications',
        data: { pageId: 'my-applications' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'applications/:id/status',
        data: { pageId: 'application-status' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'interviews',
        data: { pageId: 'interviews' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
      {
        path: 'reapply-blocked',
        data: { pageId: 'reapply-blocked' },
        loadComponent: () =>
          import('./features/candidate/candidate-page.component').then((component) => component.CandidatePageComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];
