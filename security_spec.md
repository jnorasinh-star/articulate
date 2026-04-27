# Security Specification for Articulate

## Data Invariants
1. A user can only access and modify their own profile and SRS data.
2. Points in the leaderboard must match the points in the user's profile.
3. Words are read-only for standard users.
4. User IDs in data must match the authenticated user UID.
5. Leaderboard entries must be updated atomically or validated against the user's source of truth.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to update another user's `points`.
2. **Point Inflation**: Attempt to set `points` to 999,999 without earning them.
3. **SRS Shortcut**: Set `nextReview` to a date in the past to spam reviews for points.
4. **Shadow Field Injection**: Adding `isAdmin: true` to a user profile update.
5. **ID Poisoning**: Creating a Word with a 2MB string as ID.
6. **Relational Break**: Creating an SRS item for a word that doesn't exist in the `/words` collection.
7. **Social Engineering**: Reading another user's PII (if any existed, but for now we isolate).
8. **Leaderboard Bypass**: Writing to the global leaderboard with points that don't match the profile.
9. **Level Skip**: Manually sets level to 'expert' without passing the placement test.
10. **Term Poisoning**: Attempting to write a new Word document.
11. **Immutability Breach**: Changing `createdAt` on a user profile.
12. **Negative Points**: Setting points to a negative number.

## Test Strategy
- Verify `PERMISSION_DENIED` for all above payloads.
- Verify `ALLOWED` for legitimate profile updates (displayName).
- Verify `ALLOWED` for SRS progress updates matching `request.time`.
