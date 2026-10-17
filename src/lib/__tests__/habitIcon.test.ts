import { habitGlyph } from '../habitIcon';

describe('habitGlyph', () => {
  it('maps the seeded slugs to emoji', () => {
    expect(habitGlyph('sunrise')).toBe('🌅');
    expect(habitGlyph('candy-off')).toBe('🍭');
    expect(habitGlyph('Droplet')).toBe('💧');
  });
  it('falls back for unknown slugs and empty values', () => {
    expect(habitGlyph('some-new-slug')).toBe('🌸');
    expect(habitGlyph('')).toBe('🌸');
    expect(habitGlyph(null)).toBe('🌸');
  });
  it('keeps emoji as typed', () => {
    expect(habitGlyph('🧘')).toBe('🧘');
    expect(habitGlyph(' 🌸 ')).toBe('🌸');
  });
});
