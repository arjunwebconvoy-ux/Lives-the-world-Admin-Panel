# Security Specification — Live The World Admin Panel

## 1. Data Invariants

1. **Zero-Trust Admin Boundary**: Only authenticated, email-verified users whose UID exists as an active record in `/admins/{uid}` OR whose verified email matches the bootstrapped super admin (`arjun9676kumar@gmail.com`) may read or write operational collections (`customers`, `bookings`, `payments`, `enquiries`, `destinations`, `packages`, `vehicles`, `cmsItems`, `marketing`, `settings`).
2. **No Self-Assigned Privileges**: A user cannot create or modify their own `/admins/{uid}` document to elevate their role unless they are the bootstrapped super admin (`arjun9676kumar@gmail.com`) or claiming a pre-existing `/adminInvites/{email}` created by a `super_admin`.
3. **Referential Integrity on Tour Packages & Bookings**:
   - Creating a `/packages/{packageId}` document requires that the referenced `/destinations/{destinationId}` exists.
   - Creating a `/bookings/{bookingId}` document requires that both `/customers/{customerId}` and `/packages/{packageId}` exist.
   - Creating a `/payments/{paymentId}` document requires that `/bookings/{bookingId}` exists.
4. **Immutable Audit Timestamps & Creators**: `createdAt` must equal `request.time` on creation and remain immutable on updates. `updatedAt` must equal `request.time` on both creation and updates. `createdBy` on catalog items must equal `request.auth.uid` on creation and remain immutable.
5. **Terminal State Locking**: Once a booking reaches `'completed'` or `'cancelled'`, non-super-admins cannot reopen or alter financial totals; `super_admin` and `operations_manager` have audited override capability via `isAdmin()`.
6. **Strict Size & Regex Enforcement**: Every document ID path variable must match `^[a-zA-Z0-9_\-]+$` and stay `<= 128` characters. Every string field has strict `.size()` bounds.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)

1. **Unauthenticated Read of Customers PII**: Unauthenticated `get` / `list` on `/customers`.
2. **Unverified Email Admin Spoof**: Authenticated user with `email: 'arjun9676kumar@gmail.com'` and `email_verified: false` attempting to read `/bookings`.
3. **Self-Assigned Super Admin Escalation**: Non-admin authenticated user creating `/admins/{uid}` with `{ role: 'super_admin', status: 'active' }`.
4. **Shadow Field Injection on Destination Create**: Admin creating `/destinations/shimla` with an extra undeclared ghost field `{ isRootOverride: true }`.
5. **ID Poisoning Attack**: Admin attempting to write `/destinations/` with a 500-character document ID containing invalid characters (`../../admin`).
6. **Orphaned Package Creation**: Admin creating `/packages/pkg_orphan` referencing non-existent `destinationId: 'non_existent_dest'`.
7. **Orphaned Booking Creation**: Admin creating `/bookings/bk_orphan` referencing non-existent `customerId` or `packageId`.
8. **Timestamp Forgery**: Admin creating `/enquiries/enq_1` with backdated `createdAt` not equal to `request.time`.
9. **Immutable `createdAt` Tampering**: Admin updating `/bookings/bk_1` while altering `createdAt`.
10. **Value Poisoning on Booking Update**: Admin updating `/bookings/bk_1` setting `totalAmount` to a string or negative number (`-500`).
11. **Oversized Array Exhaustion**: Admin creating `/packages/pkg_1` with `inclusions` array exceeding 25 items or non-string first element.
12. **Blanket Non-Admin List Scraping**: Signed-in non-admin user executing `list` on `/enquiries` or `/payments`.
