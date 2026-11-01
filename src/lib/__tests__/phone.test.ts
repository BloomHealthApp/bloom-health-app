import { composePhone, splitPhone, validatePhoneParts } from '../authForm';

describe('composePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['98765-43210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
  ])('turns %s into one saved format', (typed, e164) => {
    expect(composePhone('+91', typed)).toBe(e164);
  });
  it('uses the chosen country and keeps a typed full number', () => {
    expect(composePhone('+1', '4155550100')).toBe('+14155550100');
    expect(composePhone('+91', '+14155550100')).toBe('+14155550100');
  });
  it("doesn't strip a real number that begins with the country digits", () => {
    expect(composePhone('+91', '9198765432')).toBe('+919198765432');
  });
});

describe('validatePhoneParts', () => {
  it('needs exactly 10 digits for India', () => {
    expect(validatePhoneParts('+91', '9876543210')).toBeNull();
    expect(validatePhoneParts('+91', '098765 43210')).toBeNull();
    expect(validatePhoneParts('+91', '98765')).toMatch(/10-digit/);
    expect(validatePhoneParts('+91', '')).toMatch(/Enter/);
    expect(validatePhoneParts('+91', 'abc')).toMatch(/digits/);
  });
  it('allows 8 to 15 digits elsewhere', () => {
    expect(validatePhoneParts('+65', '81234567')).toBeNull();
    expect(validatePhoneParts('+65', '123')).toMatch(/8 to 15/);
  });
});

describe('splitPhone', () => {
  it('splits a saved number, and defaults to India when empty', () => {
    expect(splitPhone('+919876543210')).toEqual({ countryCode: '+91', number: '9876543210' });
    expect(splitPhone('+14155550100')).toEqual({ countryCode: '+1', number: '4155550100' });
    expect(splitPhone(null)).toEqual({ countryCode: '+91', number: '' });
  });
  it('keeps an unknown country code in the number', () => {
    expect(splitPhone('+33612345678').number).toBe('+33612345678');
    expect(composePhone(splitPhone('+33612345678').countryCode, splitPhone('+33612345678').number)).toBe('+33612345678');
  });
});
