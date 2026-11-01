import { isTablet } from '../device';

describe('isTablet', () => {
  it('treats a phone as not a tablet, in either orientation', () => {
    expect(isTablet(360, 800)).toBe(false);
    expect(isTablet(800, 360)).toBe(false);
  });
  it('treats a screen of 600dp or more on its shorter side as a tablet', () => {
    expect(isTablet(600, 960)).toBe(true);
    expect(isTablet(800, 1280)).toBe(true);
  });
});
