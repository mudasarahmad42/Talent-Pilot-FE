const JOB_DESCRIPTION_SECTION_HEADINGS = [
  'Role Summary',
  'Responsibilities',
  'Required Skills',
  'Experience and Context',
  'Collaboration',
  'Requirements',
  'Qualifications',
  'Nice to Have',
  'About the Role',
  'Key Responsibilities',
  'Skills',
];

export function formatJobDescription(description: string | null | undefined): string {
  let formatted = (description ?? '').replace(/\r\n/g, '\n').replace(/\*\*/g, '').trim();

  for (const heading of JOB_DESCRIPTION_SECTION_HEADINGS) {
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    formatted = formatted.replace(new RegExp(`\\s*\\b${escapedHeading}\\s*:\\s*`, 'gi'), `\n\n${heading}\n`);
  }

  formatted = formatted
    .replace(/\s+\*\s+/g, '\n- ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return formatted || 'No description recorded.';
}
