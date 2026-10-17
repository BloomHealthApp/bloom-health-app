import { ApiError, NetworkError } from '@/api/errors';
import { authErrorMessage, isAlreadyRegistered, validateEmail, validateIdentifier, validateName, validatePhone } from '../authForm';

describe('authForm validation', () => {
  it('name 1-40 chars after trim', () => {
    expect(validateName('  ')).not.toBeNull();
    expect(validateName(' A ')).toBeNull();
    expect(validateName('x'.repeat(40))).toBeNull();
    expect(validateName('x'.repeat(41))).not.toBeNull();
  });
  it('phone 8-15 digits allowing +, spaces, dashes', () => {
    for (const ok of ['+91 98765-43210', '12345678', '+123456789012345']) expect(validatePhone(ok)).toBeNull();
    for (const bad of ['1234567', '1234567890123456', 'abc12345678', '98765(43210)', '']) expect(validatePhone(bad)).not.toBeNull();
  });
  it('email', () => {
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateEmail('a@b')).not.toBeNull();
    expect(validateEmail(`${'a'.repeat(250)}@b.co`)).not.toBeNull();
  });
  it('identifier: email when it contains @, otherwise phone', () => {
    expect(validateIdentifier('a@b.co')).toBeNull();
    expect(validateIdentifier('+919876543210')).toBeNull();
    expect(validateIdentifier('a@b')).not.toBeNull();
    expect(validateIdentifier('hello')).not.toBeNull();
    expect(validateIdentifier(' ')).not.toBeNull();
  });
});

describe('authErrorMessage', () => {
  it('maps network, rate limit, conflict and validation errors', () => {
    expect(authErrorMessage(new NetworkError(), 'x')).toMatch(/No connection/);
    expect(authErrorMessage(new ApiError(429, 'rate_limited', 'm', undefined, 120), 'x')).toMatch(/2 min/);
    expect(authErrorMessage(new ApiError(409, 'already_registered', 'm'), 'x')).toMatch(/already exists/);
    expect(authErrorMessage(new ApiError(400, 'validation_failed', 'email is not valid'), 'x')).toBe('email is not valid');
    expect(authErrorMessage(new ApiError(500, 'internal', 'HTTP 500'), 'fallback')).toBe('fallback');
    expect(isAlreadyRegistered(new ApiError(409, 'already_registered', 'm'))).toBe(true);
    expect(isAlreadyRegistered(new Error('x'))).toBe(false);
  });
});
