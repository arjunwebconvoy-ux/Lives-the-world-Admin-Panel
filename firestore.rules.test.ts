/**
 * Firestore Security Rules Test Suite (Dirty Dozen Adversarial Verification)
 * Validates that all 12 attack vectors in security_spec.md are rejected by firestore.rules.
 */
export const dirtyDozenTestCases = [
  { name: '1. Unauthenticated read of /customers PII', collection: 'customers', action: 'get', auth: null, expect: 'PERMISSION_DENIED' },
  { name: '2. Unverified email admin spoof on /bookings', collection: 'bookings', action: 'list', auth: { email: 'arjun9676kumar@gmail.com', email_verified: false }, expect: 'PERMISSION_DENIED' },
  { name: '3. Self-assigned super_admin role in /admins/{uid}', collection: 'admins', action: 'create', auth: { uid: 'attacker1', email: 'attacker@example.com', email_verified: true }, payload: { role: 'super_admin', status: 'active' }, expect: 'PERMISSION_DENIED' },
  { name: '4. Shadow field injection on /destinations create', collection: 'destinations', action: 'create', payload: { isRootOverride: true }, expect: 'PERMISSION_DENIED' },
  { name: '5. ID poisoning with invalid path characters', collection: 'destinations', docId: '../../admin', action: 'create', expect: 'PERMISSION_DENIED' },
  { name: '6. Orphaned package referencing missing destinationId', collection: 'packages', action: 'create', payload: { destinationId: 'non_existent_dest' }, expect: 'PERMISSION_DENIED' },
  { name: '7. Orphaned booking referencing missing customerId/packageId', collection: 'bookings', action: 'create', payload: { customerId: 'missing', packageId: 'missing' }, expect: 'PERMISSION_DENIED' },
  { name: '8. Timestamp forgery on enquiry create', collection: 'enquiries', action: 'create', payload: { createdAt: '2020-01-01T00:00:00Z' }, expect: 'PERMISSION_DENIED' },
  { name: '9. Immutable createdAt mutation on booking update', collection: 'bookings', action: 'update', payload: { createdAt: '2020-01-01T00:00:00Z' }, expect: 'PERMISSION_DENIED' },
  { name: '10. Value poisoning on booking totalAmount', collection: 'bookings', action: 'update', payload: { totalAmount: -500 }, expect: 'PERMISSION_DENIED' },
  { name: '11. Oversized array exhaustion in package inclusions', collection: 'packages', action: 'create', payload: { inclusions: new Array(30).fill('item') }, expect: 'PERMISSION_DENIED' },
  { name: '12. Blanket non-admin list scraping on /payments', collection: 'payments', action: 'list', auth: { uid: 'user1', email: 'guest@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' }
];
