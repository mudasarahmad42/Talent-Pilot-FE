import { formatJobDescription } from './job-description-formatting';

describe('formatJobDescription', () => {
  it('formats colon-delimited sections into readable blocks', () => {
    const description =
      'Senior Java Developer Job Description Role Summary: Build scalable services. Responsibilities: * Design APIs * Review code Required Skills: Java SQL';

    expect(formatJobDescription(description)).toBe(
      [
        'Senior Java Developer Job Description',
        '',
        'Role Summary',
        'Build scalable services.',
        '',
        'Responsibilities',
        '- Design APIs',
        '- Review code',
        '',
        'Required Skills',
        'Java SQL',
      ].join('\n'),
    );
  });

  it('removes generated underline separators from AI-drafted descriptions', () => {
    const description = [
      'Senior React Developer Request',
      '=========================',
      'Role Summary',
      '----------',
      'Build and maintain React applications.',
      'Required Skills ----------------',
      'React, Redux, SCSS, TypeScript',
      'Collaboration ------------ Regular updates with PMO and Engineering.',
    ].join('\n');

    expect(formatJobDescription(description)).toBe(
      [
        'Senior React Developer Request',
        '',
        'Role Summary',
        'Build and maintain React applications.',
        '',
        'Required Skills',
        'React, Redux, SCSS, TypeScript',
        '',
        'Collaboration',
        'Regular updates with PMO and Engineering.',
      ].join('\n'),
    );
  });
});
