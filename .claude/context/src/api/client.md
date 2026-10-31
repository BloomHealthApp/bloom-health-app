# ApiClient (`client.ts`)

## Purpose
Typed HTTP client with auth, token refresh, timeouts and response parsing. `fetchFn` and `TokenProvider` are injected, so tests and mock mode run the real client.

## Behavior
- 15-second timeout. A thrown fetch, including a timeout, becomes `NetworkError`.
- Refreshes when the token has under 20 seconds left, and again on a 401, retrying the request once.
- `refreshOnce` shares one refresh between concurrent requests. This matters because refresh tokens rotate and reuse revokes the session family.
- Every response with a schema is parsed with zod. A mismatch throws `ApiError(502, 'invalid_response')`.

## Rules
- Only a 401 or 403 from refresh ends the session. Being offline during refresh must keep the user signed in.
- A final 401 on an authenticated request calls `onAuthLost`.

## Gotchas
- `retryable` is true for 5xx and 429. Other 4xx errors aren't retried.
- `invalid_response` has status 502, so it counts as retryable.
- `logout` clears tokens even if the server call fails.
