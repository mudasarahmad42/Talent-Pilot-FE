import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { CandidateSignupComponent } from './candidate-signup.component';

describe('CandidateSignupComponent', () => {
  const authMock = {
    isLoggingIn: signal(false),
    loginError: signal(''),
    signupCandidate: vi.fn(),
  };
  const storeMock = {
    loadPortalInvitation: vi.fn(),
  };

  beforeEach(async () => {
    authMock.isLoggingIn.set(false);
    authMock.loginError.set('');
    authMock.signupCandidate.mockReset();
    storeMock.loadPortalInvitation.mockReset();
    storeMock.loadPortalInvitation.mockResolvedValue({
      candidateInvitationId: 'invite-1',
      jobPostId: 'post-1',
      jobTitle: 'Senior Java Backend Engineer',
      companyName: 'TKXEL Careers',
      candidateDisplayName: 'Muhammad Ali',
      candidateEmail: 'muhammad.ali@example.com',
      status: 'Sent',
      expiresAtUtc: '2026-06-10T00:00:00Z',
      usedAtUtc: null,
      isExpired: false,
      isRevoked: false,
    });

    await TestBed.configureTestingModule({
      imports: [CandidateSignupComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ tenantSlug: 'tkxel' }),
              queryParamMap: convertToParamMap({
                jobPostId: 'post-1',
                inviteId: 'invite-1',
                token: 'tracked-token',
                returnUrl: '/candidate/tkxel/apply/post-1?source=invite&inviteId=invite-1&token=tracked-token',
                tenantSlug: 'tkxel',
              }),
            },
          },
        },
        { provide: AuthService, useValue: authMock },
        { provide: TalentPilotStoreService, useValue: storeMock },
      ],
    }).compileComponents();
  });

  it('prefills invited candidate identity and submits invite tracking with the new password', async () => {
    const fixture = TestBed.createComponent(CandidateSignupComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    expect(storeMock.loadPortalInvitation).toHaveBeenCalledWith('invite-1', 'tracked-token');
    expect(component.displayName).toBe('Muhammad Ali');
    expect(component.email).toBe('muhammad.ali@example.com');
    expect(inputs[0].readOnly).toBe(true);
    expect(inputs[1].readOnly).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Add a password to activate your candidate account.');

    component.password = 'StrongPass123';
    component.confirmPassword = 'StrongPass123';
    component.submit();

    expect(authMock.signupCandidate).toHaveBeenCalledWith(
      {
        tenantSlug: 'tkxel',
        jobPostId: 'post-1',
        displayName: 'Muhammad Ali',
        email: 'muhammad.ali@example.com',
        password: 'StrongPass123',
        candidateInvitationId: 'invite-1',
        invitationToken: 'tracked-token',
      },
      false,
      '/candidate/tkxel/apply/post-1?source=invite&inviteId=invite-1&token=tracked-token',
    );
  });
});
