import { Injectable, inject } from '@angular/core';
import {
  JobPostListItem,
  ManualCandidateSearchItem,
  RecruiterApplication,
  RecruiterApplicationInterview,
  RecruiterSourcing,
  RecruitmentQueueItem,
} from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

export interface CandidateOperationsApplication {
  application: RecruiterApplication;
  sourcing: RecruiterSourcing;
  jobPost?: JobPostListItem | null;
}

export interface CandidateOperationsInterview {
  interview: RecruiterApplicationInterview;
  application: RecruiterApplication;
  sourcing: RecruiterSourcing;
  jobPost?: JobPostListItem | null;
}

export interface CandidateOperationsDataset {
  jobPosts: JobPostListItem[];
  queueItems: RecruitmentQueueItem[];
  sourcing: RecruiterSourcing[];
  applications: CandidateOperationsApplication[];
  candidates: ManualCandidateSearchItem[];
  interviews: CandidateOperationsInterview[];
}

@Injectable({ providedIn: 'root' })
export class CandidateOperationsDataService {
  private readonly store = inject(TalentPilotStoreService);

  async load(): Promise<CandidateOperationsDataset> {
    const [publishing, queue] = await Promise.all([
      this.store.loadJobPublishing().catch(() => ({ items: [] })),
      this.store.loadRecruitmentQueue().catch(() => ({ items: [] })),
    ]);

    const jobPosts = publishing.items ?? [];
    const queueItems = queue.items ?? [];
    const requestIds = Array.from(
      new Set([
        ...jobPosts.map((post) => post.jobRequestId),
        ...queueItems.map((item) => item.jobRequest.id),
      ]),
    ).filter(Boolean);

    const sourcingResults = await Promise.allSettled(
      requestIds.map((jobRequestId) => this.store.loadRecruiterSourcing(jobRequestId)),
    );
    const sourcing = sourcingResults
      .filter((result): result is PromiseFulfilledResult<RecruiterSourcing> => result.status === 'fulfilled')
      .map((result) => this.normalizeSourcing(result.value));

    const jobPostByRequestId = new Map(jobPosts.map((post) => [post.jobRequestId, post]));
    const applications = sourcing.flatMap((item) =>
      item.applications.map((application) => ({
        application,
        sourcing: item,
        jobPost: jobPostByRequestId.get(item.jobRequest.id) ?? null,
      })),
    );

    const interviews = applications.flatMap((item) =>
      item.application.interviews.map((interview) => ({
        interview,
        application: item.application,
        sourcing: item.sourcing,
        jobPost: item.jobPost,
      })),
    );

    return {
      jobPosts,
      queueItems,
      sourcing,
      applications,
      candidates: this.mergeCandidates(sourcing.flatMap((item) => item.candidateSearchItems)),
      interviews,
    };
  }

  private normalizeSourcing(sourcing: RecruiterSourcing): RecruiterSourcing {
    return {
      ...sourcing,
      applications: sourcing.applications ?? [],
      candidateSearchItems: sourcing.candidateSearchItems ?? [],
      talentRediscoveryMatches: sourcing.talentRediscoveryMatches ?? [],
      interviewTemplates: sourcing.interviewTemplates ?? [],
      hodInterviewers: sourcing.hodInterviewers ?? [],
      skills: sourcing.skills ?? [],
    };
  }

  private mergeCandidates(candidates: ManualCandidateSearchItem[]): ManualCandidateSearchItem[] {
    const byId = new Map<string, ManualCandidateSearchItem>();
    for (const candidate of candidates) {
      const current = byId.get(candidate.candidateId);
      if (!current) {
        byId.set(candidate.candidateId, { ...candidate });
        continue;
      }

      byId.set(candidate.candidateId, {
        ...current,
        status: current.status === 'Active' ? current.status : candidate.status,
        skills: this.mergeStrings(current.skills, candidate.skills),
        matchedSkills: this.mergeStrings(current.matchedSkills, candidate.matchedSkills),
        missingSkills: this.mergeStrings(current.missingSkills, candidate.missingSkills),
        applicationCount: Math.max(current.applicationCount, candidate.applicationCount),
        passedInterviews: Math.max(current.passedInterviews, candidate.passedInterviews),
        failedInterviews: Math.max(current.failedInterviews, candidate.failedInterviews),
        totalInterviews: Math.max(current.totalInterviews, candidate.totalInterviews),
        latestApplication: this.latestApplication(current, candidate),
      });
    }

    return [...byId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  private mergeStrings(left: string[], right: string[]): string[] {
    return Array.from(new Set([...(left ?? []), ...(right ?? [])])).sort((a, b) => a.localeCompare(b));
  }

  private latestApplication(
    left: ManualCandidateSearchItem,
    right: ManualCandidateSearchItem,
  ): ManualCandidateSearchItem['latestApplication'] {
    const leftApplication = left.latestApplication;
    const rightApplication = right.latestApplication;
    if (!leftApplication) {
      return rightApplication ?? null;
    }
    if (!rightApplication) {
      return leftApplication;
    }

    return new Date(rightApplication.appliedAt).getTime() > new Date(leftApplication.appliedAt).getTime()
      ? rightApplication
      : leftApplication;
  }
}
