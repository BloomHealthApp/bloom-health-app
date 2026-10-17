export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';
export const API_PREFIX = '/v1';
