const ACTIVITY_TITLE_LABELS: Record<string, string> = {
  'job_request.created': 'Job request created',
  'job_request.updated': 'Job request updated',
  'job_request.submitted': 'Submitted to PMO',
  'job_request.routed': 'Routed for PMO review',
  'workflow.assignment.created': 'Workflow assignment created',
  'workflow.assignment.claimed': 'Ownership claimed',
  'pmo.review.claimed': 'PMO review claimed',
  'pmo.employee.referred': 'Internal employee recommended',
  'pmo.forwarded_to_recruiting': 'Forwarded to recruiting',
  'presales.referral.accepted': 'Recommendation accepted',
  'presales.referral.rejected': 'Recommendation rejected',
  'job_post.created': 'Job post draft created',
  'job_post.updated': 'Job post updated',
  'job_post.published': 'Job post published',
  'job_application.created': 'Application created',
  'job_application.forwarded_to_hiring_manager': 'Forwarded to hiring manager',
  'interview.scheduled': 'Interview scheduled',
  'interview.feedback.submitted': 'Interview feedback submitted',
  'offer_letter.created': 'Offer letter drafted',
  'offer.presentation_meeting.scheduled': 'Offer presentation scheduled',
  'hiring.outcome.updated': 'Hiring outcome recorded',
};

export function formatActivityTitle(title: string): string {
  const normalized = title.trim();
  return ACTIVITY_TITLE_LABELS[normalized] ?? humanizeActivityTitle(normalized);
}

function humanizeActivityTitle(title: string): string {
  const text = title.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : 'Activity updated';
}
