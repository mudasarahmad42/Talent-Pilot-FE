import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { MyWorkComponent } from './my-work.component';

describe('MyWorkComponent', () => {
  const auth = {
    hasAnyRole: vi.fn(() => true),
  };
  const store = {
    myWork: vi.fn((): unknown[] => []),
    getUserName: vi.fn(() => 'Fatima Noor'),
    loadHiringManagerReviews: vi.fn(),
    loadMyInterviewTasks: vi.fn(),
  };

  let fixture: ComponentFixture<MyWorkComponent>;

  beforeEach(async () => {
    auth.hasAnyRole.mockReturnValue(true);
    store.myWork.mockReturnValue([
      {
        assignment: {
          id: 'assignment-closed',
          stage: 'Closed',
          assignedAt: '2026-06-05T10:00:00Z',
          assignedToUserId: 'hm-1',
          claimedByUserId: null,
        },
        jobRequest: {
          id: 'request-closed',
          code: 'TP-CLOSED',
          title: 'Closed Role',
          client: 'Client ABC',
          department: 'Engineering',
          stage: 'Closed',
        },
      },
      {
        assignment: {
          id: 'assignment-review',
          stage: 'Hiring Manager Review',
          assignedAt: '2026-06-05T11:00:00Z',
          assignedToUserId: 'hm-1',
          claimedByUserId: null,
        },
        jobRequest: {
          id: 'request-review-only',
          code: 'TP-HM-REVIEW',
          title: 'Review Role',
          client: 'Client XYZ',
          department: 'Delivery',
          stage: 'Hiring Manager Review',
        },
      },
    ]);
    store.getUserName.mockReturnValue('Fatima Noor');
    store.loadHiringManagerReviews.mockResolvedValue({
      items: [
        {
          jobApplicationId: 'application-1',
          jobRequestId: 'request-1',
          jobPostId: 'post-1',
          requestCode: 'TP-REQ-021',
          jobTitle: 'Senior Python Developer',
          client: 'Tesla',
          department: 'Engineering',
          candidateName: 'Farhan Ahmad',
          candidateEmail: 'farhan@example.com',
          status: 'HiringManagerReview',
          hiringManagerName: 'Fatima Noor',
          updatedAt: '2026-06-06T11:04:31Z',
          offerLetterStatus: null,
          latestMeetingAt: null,
        },
        {
          jobApplicationId: 'application-2',
          jobRequestId: 'request-2',
          jobPostId: 'post-2',
          requestCode: 'TP-HIRED',
          jobTitle: 'QA Automation Engineer',
          client: 'Internal Platform',
          department: 'QA',
          candidateName: 'Zara Iqbal',
          candidateEmail: 'zara@example.com',
          status: 'Hired',
          hiringManagerName: 'Fatima Noor',
          updatedAt: '2026-06-06T10:04:31Z',
          offerLetterStatus: null,
          latestMeetingAt: null,
        },
        {
          jobApplicationId: 'application-3',
          jobRequestId: 'request-3',
          jobPostId: 'post-3',
          requestCode: 'TP-HOLD',
          jobTitle: 'Java Platform Engineer',
          client: 'AZAQ',
          department: 'Engineering',
          candidateName: 'Farah Qureshi',
          candidateEmail: 'farah@example.com',
          status: 'OnHold',
          hiringManagerName: 'Fatima Noor',
          updatedAt: '2026-06-06T09:04:31Z',
          offerLetterStatus: null,
          latestMeetingAt: null,
        },
      ],
    });
    store.loadMyInterviewTasks.mockResolvedValue({ items: [] });

    await TestBed.configureTestingModule({
      imports: [MyWorkComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: TalentPilotStoreService, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyWorkComponent);
  });

  it('shows hiring-manager applications without an offer letter as pending offer-letter work', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = pageText();
    expect(text).toContain('Offer Letter');
    expect(text).toContain('TP-REQ-021');
    expect(text).toContain('Farhan Ahmad - Senior Python Developer');
    expect(text).toContain('Offer letter pending');
    expect(text).toContain('Generate offer letter');
  });

  it('uses separate badge colors for each My Work status', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(statusBadgeClass('Hired')).toContain('my-work-status--success');
    expect(statusBadgeClass('On Hold')).toContain('my-work-status--hold');
    expect(statusBadgeClass('Offer letter pending')).toContain('my-work-status--offer-pending');
    expect(statusBadgeClass('Closed')).toContain('my-work-status--closed');
    expect(statusBadgeClass('Hiring Manager Review')).toContain('my-work-status--review');
  });

  function pageText(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function statusBadgeClass(statusText: string): string {
    const badges = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.status-badge'));
    const badge = badges.find((element) => element.textContent?.replace(/\s+/g, ' ').trim() === statusText);
    expect(badge).toBeTruthy();
    return badge?.className ?? '';
  }
});
