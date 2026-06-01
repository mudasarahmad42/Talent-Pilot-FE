import {
  buildSkillGroupTabs,
  selectedSkillOptionsFor,
  toggleSkillId,
  visibleSkillsForPicker,
} from './skill-groups';

describe('skill group picker helpers', () => {
  const skills = [
    { id: 'skill-java', name: 'Java', description: 'Software Engineer / Backend Engineer' },
    { id: 'skill-react', name: 'React', description: 'Frontend Engineer' },
    { id: 'skill-terraform', name: 'Terraform', description: 'DevOps Engineer' },
    { id: 'skill-screening', name: 'Candidate Screening', description: 'HR / Recruiter' },
  ];

  it('groups skills by role-family metadata and known skill names', () => {
    const tabs = buildSkillGroupTabs(skills);

    expect(tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Software Engineer / Backend Engineer', count: 1 }),
        expect.objectContaining({ label: 'Frontend Engineer', count: 1 }),
        expect.objectContaining({ label: 'DevOps Engineer', count: 1 }),
        expect.objectContaining({ label: 'HR / Recruiter', count: 1 }),
      ]),
    );
  });

  it('searches across all groups instead of only the active tab', () => {
    const results = visibleSkillsForPicker(skills, 'candidate', 'Frontend Engineer');

    expect(results.map((skill) => skill.id)).toEqual(['skill-screening']);
  });

  it('keeps selected skill IDs independent of tab changes', () => {
    const selectedIds = toggleSkillId(['skill-react'], 'skill-terraform', true);
    const selected = selectedSkillOptionsFor(skills, selectedIds);
    const backendVisible = visibleSkillsForPicker(skills, '', 'Software Engineer / Backend Engineer');

    expect(selected.map((skill) => skill.id)).toEqual(['skill-react', 'skill-terraform']);
    expect(backendVisible.map((skill) => skill.id)).toContain('skill-java');
    expect(selectedIds).toContain('skill-react');
  });
});
