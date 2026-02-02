const resources = require('../resources');

describe('config/resources', () => {
  it('has expected categories', () => {
    expect(resources.categories).toHaveProperty('crisis');
    expect(resources.categories).toHaveProperty('loneliness');
    expect(resources.categories).toHaveProperty('wellbeing');
    expect(resources.categories.crisis.label).toBe('Crisis / mental health');
  });

  it('getCompactList returns one line per category with key and oneLiner', () => {
    const list = resources.getCompactList();
    expect(list).toContain('crisis:');
    expect(list).toContain('Immediate support for crisis');
    expect(list).toContain('loneliness:');
    expect(list).toContain('wellbeing:');
  });

  it('getResourcesTextForCategories returns empty string for empty or unknown keys', () => {
    expect(resources.getResourcesTextForCategories([])).toBe('');
    expect(resources.getResourcesTextForCategories(null)).toBe('');
    expect(resources.getResourcesTextForCategories(['unknown'])).toBe('');
  });

  it('getResourcesTextForCategories returns formatted text for valid keys', () => {
    const text = resources.getResourcesTextForCategories(['crisis']);
    expect(text).toContain('--- Crisis / mental health ---');
    expect(text).toContain('988');
    expect(text).toContain('NAMI');
    expect(text).toContain('---');
  });

  it('getResourcesTextForCategories includes multiple categories', () => {
    const text = resources.getResourcesTextForCategories(['crisis', 'wellbeing']);
    expect(text).toContain('Crisis / mental health');
    expect(text).toContain('Interests / wellbeing');
  });
});
