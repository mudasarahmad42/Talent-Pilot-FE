import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { RagChatResponse, RagConversation } from '../core/models';
import { TalentPilotStoreService } from '../core/talent-pilot-store.service';
import { RagAssistantPanelComponent } from './rag-assistant-panel.component';

describe('RagAssistantPanelComponent', () => {
  let fixture: ComponentFixture<RagAssistantPanelComponent>;
  let store: {
    loadAssistantConversation: ReturnType<typeof vi.fn>;
    loadAssistantConversationById: ReturnType<typeof vi.fn>;
    sendAssistantMessage: ReturnType<typeof vi.fn>;
    submitAssistantFeedback: ReturnType<typeof vi.fn>;
  };
  let resolveAssistantMessage: (response: RagChatResponse) => void;

  const completedConversation: RagConversation = {
    conversationId: 'conversation-1',
    contextType: 'PmoRequest',
    contextEntityId: 'job-request-1',
    focusEntityId: null,
    title: 'Request Copilot',
    createdAtUtc: '2026-06-04T12:00:00Z',
    updatedAtUtc: '2026-06-04T12:01:00Z',
    messages: [
      {
        messageId: 'message-user-1',
        role: 'User',
        content: 'Which bench employee is closest?',
        createdAtUtc: '2026-06-04T12:00:00Z',
        citations: [],
      },
      {
        messageId: 'message-assistant-1',
        role: 'Assistant',
        content: 'Hamza Ali is closest based on the retrieved match evidence.',
        model: 'llama3.2',
        agentRunId: 'agent-run-1',
        promptVersion: 'rag-assistant-v1',
        createdAtUtc: '2026-06-04T12:01:00Z',
        citations: [],
      },
    ],
  };

  beforeEach(async () => {
    store = {
      loadAssistantConversation: vi.fn().mockResolvedValue(null),
      loadAssistantConversationById: vi.fn().mockResolvedValue(completedConversation),
      sendAssistantMessage: vi.fn().mockImplementation(
        () =>
          new Promise<RagChatResponse>((resolve) => {
            resolveAssistantMessage = resolve;
          }),
      ),
      submitAssistantFeedback: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [RagAssistantPanelComponent],
      providers: [
        provideRouter([]),
        { provide: TalentPilotStoreService, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RagAssistantPanelComponent);
    fixture.componentRef.setInput('contextType', 'PmoRequest');
    fixture.componentRef.setInput('contextEntityId', 'job-request-1');
    fixture.componentRef.setInput('title', 'Request Copilot');
    fixture.componentRef.setInput('suggestedQuestions', ['Which bench employee is closest?']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('shows a suggested question as sent immediately while the first assistant response is pending', async () => {
    const suggestionButton = fixture.nativeElement.querySelector('.rag-suggestion-list button') as HTMLButtonElement;

    suggestionButton.click();
    fixture.detectChanges();

    expect(store.sendAssistantMessage).toHaveBeenCalledWith({
      contextType: 'PmoRequest',
      contextEntityId: 'job-request-1',
      focusEntityId: null,
      conversationId: null,
      message: 'Which bench employee is closest?',
    });
    expect(fixture.nativeElement.textContent).toContain('You');
    expect(fixture.nativeElement.textContent).toContain('Which bench employee is closest?');
    expect(fixture.nativeElement.textContent).toContain('Answering from retrieved evidence...');

    resolveAssistantMessage({
      conversationId: 'conversation-1',
      userMessageId: 'message-user-1',
      assistantMessageId: 'message-assistant-1',
      answer: 'Hamza Ali is closest based on the retrieved match evidence.',
      citations: [],
      model: 'llama3.2',
      agentRunId: 'agent-run-1',
      promptVersion: 'rag-assistant-v1',
      generatedAtUtc: '2026-06-04T12:01:00Z',
    });
    await fixture.whenStable();
  });

  it('opens floating launcher panels from a robot button', () => {
    fixture.componentRef.setInput('floatingLauncher', true);
    fixture.componentRef.setInput('launcherLabel', 'Open request copilot');
    fixture.detectChanges();

    const launcher = fixture.nativeElement.querySelector('.rag-floating-launcher') as HTMLButtonElement;

    expect(launcher).not.toBeNull();
    expect(launcher.getAttribute('aria-label')).toBe('Open request copilot');
    expect(fixture.nativeElement.querySelector('.rag-assistant-panel.floating-closed')).not.toBeNull();

    launcher.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.rag-assistant-panel.mobile-open')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.rag-floating-launcher')).toBeNull();
  });

  it('renders assistant citations as readable references without internal scope text', () => {
    fixture.componentInstance.conversation.set({
      ...completedConversation,
      messages: [
        {
          messageId: 'message-assistant-cited',
          role: 'Assistant',
          content:
            'This question is in scope for the Recruiter Candidate Fit context.\n\nCandidate Amara Haq has been ranked 1 with a score of 89.0000 [C1], with Java and Kafka evidence [C2].',
          model: 'llama3.2',
          agentRunId: 'agent-run-2',
          promptVersion: 'rag-assistant-v3',
          createdAtUtc: '2026-06-04T12:02:00Z',
          citations: [
            {
              citationId: 'citation-1',
              knowledgeChunkId: 'chunk-1',
              label: 'C1',
              sourceTitle: 'Unknown applicant ranking rationale',
              sourceType: 'ApplicantRanking',
              sourceEntityId: 'application-1',
              sourceRoute: '/app/recruitment/sourcing/job-request-1',
              score: 0.91,
              excerpt:
                'Candidate: Unknown applicant Rank: 1 Score: 89.0000 Confidence: Low Explanation: Amara has the strongest current fit for the Java backend role. Matched skills: Java, Kafka, SQL',
            },
            {
              citationId: 'citation-2',
              knowledgeChunkId: 'chunk-2',
              label: 'C2',
              sourceTitle: 'Amara Haq',
              sourceType: 'CandidateApplication',
              sourceEntityId: 'application-1',
              sourceRoute: '/app/recruitment/sourcing/job-request-1',
              score: 0.88,
              excerpt: 'Candidate profile evidence.',
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('This question is in scope');
    expect(text).not.toContain('[C1]');
    expect(text).not.toContain('[C2]');
    expect(text).toContain('score of 89');
    expect(text).toContain('Reference 1');
    expect(text).toContain('Reference 2');
    expect(text).toContain('References');
    expect(text).toContain('Applicant ranking rationale');
    expect(text).not.toContain('Unknown applicant');
    expect(text).toContain('Amara Haq');

    const referenceElements = fixture.nativeElement.querySelectorAll('.rag-inline-reference, .rag-citation-chip');
    expect(referenceElements.length).toBeGreaterThan(0);
    referenceElements.forEach((element: Element) => {
      expect(element.getAttribute('title')).toBeNull();
    });
  });

  it('shows a structured evidence preview for citation chips', () => {
    fixture.componentInstance.contextType = 'RecruiterCandidateFit';
    fixture.componentInstance.conversation.set({
      ...completedConversation,
      messages: [
        {
          messageId: 'message-assistant-cited',
          role: 'Assistant',
          content: 'Amara is the strongest fit [C1].',
          model: 'llama3.2',
          agentRunId: 'agent-run-2',
          promptVersion: 'rag-assistant-v4',
          createdAtUtc: '2026-06-04T12:02:00Z',
          citations: [
            {
              citationId: 'citation-1',
              knowledgeChunkId: 'chunk-1',
              label: 'C1',
              sourceTitle: 'Unknown applicant ranking rationale',
              sourceType: 'ApplicantRanking',
              sourceEntityId: 'application-1',
              sourceRoute: '/app/recruitment/sourcing/job-request-1',
              score: 0.91,
              excerpt:
                'Candidate: Unknown applicant Rank: 1 Score: 89.0000 Confidence: Low Explanation: Amara has the strongest current fit for the Java backend role. Matched skills: Java, Kafka, SQL',
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const citationChipWrap = fixture.nativeElement.querySelector('.rag-citation-chip-wrap') as HTMLElement;
    citationChipWrap.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Evidence preview');

    const citationChip = fixture.nativeElement.querySelector('.rag-citation-chip') as HTMLButtonElement;
    citationChip.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Evidence preview');
    expect(text).toContain('Retrieval relevance');
    expect(text).toContain('91%');
    expect(text).toContain('Applicant score');
    expect(text).toContain('89%');
    expect(text).toContain('Rank');
    expect(text).toContain('Low');
    expect(text).toContain('Java');
    expect(text).toContain('Kafka');
    expect(text).toContain('SQL');
    expect(text).toContain('Amara has the strongest current fit');
    expect(text).not.toContain('Unknown applicant');

    const sourceLink = fixture.nativeElement.querySelector('.rag-evidence-source-link') as HTMLAnchorElement;
    expect(sourceLink.getAttribute('href')).toBe('/app/recruitment/sourcing/job-request-1#applications');
  });

  it('opens citation source links with a useful section fragment', async () => {
    fixture.componentInstance.contextType = 'RecruiterCandidateFit';
    fixture.componentInstance.floatingLauncher = true;
    fixture.componentInstance.mobileOpen.set(true);
    fixture.componentInstance.conversation.set({
      ...completedConversation,
      contextType: 'RecruiterCandidateFit',
      messages: [
        {
          messageId: 'message-assistant-cited',
          role: 'Assistant',
          content: 'There was 1 irrelevant application [C1].',
          model: 'llama3.2',
          agentRunId: 'agent-run-2',
          promptVersion: 'rag-assistant-v5',
          createdAtUtc: '2026-06-04T12:02:00Z',
          citations: [
            {
              citationId: 'citation-1',
              knowledgeChunkId: 'chunk-1',
              label: 'C1',
              sourceTitle: 'TP-DEMO-101 application relevance summary',
              sourceType: 'ApplicationRelevanceSummary',
              sourceEntityId: 'job-request-1',
              sourceRoute: '/app/recruitment/sourcing/job-request-1',
              score: 0.66,
              excerpt: 'Application relevance summary. Irrelevant applications: 1.',
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const citationChip = fixture.nativeElement.querySelector('.rag-citation-chip') as HTMLButtonElement;
    citationChip.click();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const sourceLink = fixture.nativeElement.querySelector('.rag-evidence-source-link') as HTMLAnchorElement;

    sourceLink.click();
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledWith('/app/recruitment/sourcing/job-request-1#applications');
    expect(fixture.componentInstance.mobileOpen()).toBe(false);
  });

  it('opens the structured evidence preview from inline citation references', () => {
    fixture.componentInstance.conversation.set({
      ...completedConversation,
      messages: [
        {
          messageId: 'message-assistant-inline-cited',
          role: 'Assistant',
          content: 'Amara is the strongest fit [C1].',
          model: 'llama3.2',
          agentRunId: 'agent-run-3',
          promptVersion: 'rag-assistant-v4',
          createdAtUtc: '2026-06-04T12:03:00Z',
          citations: [
            {
              citationId: 'citation-inline-1',
              knowledgeChunkId: 'chunk-1',
              label: 'C1',
              sourceTitle: 'Amara Haq',
              sourceType: 'CandidateApplication',
              sourceEntityId: 'application-1',
              sourceRoute: '/app/recruitment/sourcing/job-request-1',
              score: 0.88,
              excerpt:
                'Candidate: Amara Haq Email: amara.haq@example.com Status: Active Current designation: Java Backend Engineer Current company: Product Studio Experience: 6.8 years Notice: 15 days Application status: Applied Source: Job Portal Source detail: Talent Pilot portal Cover letter: Strong backend evidence.',
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const inlineReference = fixture.nativeElement.querySelector('.rag-inline-reference') as HTMLButtonElement;
    inlineReference.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Evidence preview');

    inlineReference.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(inlineReference.getAttribute('title')).toBeNull();
    expect(text).toContain('Evidence preview');
    expect(text).toContain('Reference 1 - candidate application');
    expect(text).toContain('Retrieval relevance');
    expect(text).toContain('88%');
    expect(text).toContain('Candidate');
    expect(text).toContain('Amara Haq');
    expect(text).toContain('Email');
    expect(text).toContain('amara.haq@example.com');
    expect(text).toContain('Role');
    expect(text).toContain('Java Backend Engineer');
    expect(text).toContain('Company');
    expect(text).toContain('Product Studio');
    expect(text).toContain('Experience');
    expect(text).toContain('6.8 years');
    expect(text).toContain('Application');
    expect(text).toContain('Applied');
    expect(text).toContain('Detail');
    expect(text).toContain('Talent Pilot portal');
    expect(text).toContain('Strong backend evidence.');
    expect(text).not.toContain('Candidate: Amara Haq Email:');
    expect(text).not.toContain('Source detail:');
  });
});
