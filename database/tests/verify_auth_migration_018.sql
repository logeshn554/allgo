-- ==============================================================================
-- Read-only preflight / post-migration verification for auth migration 018.
-- Safe to run against a restored staging snapshot. Contains SELECT statements only.
-- Do not place personal data in logs or attach unredacted output to tickets.
-- ==============================================================================

-- 1. Preservation counts: record before and after migration; values must be unchanged.
SELECT 'users' AS entity, COUNT(*)::BIGINT AS row_count FROM users
UNION ALL SELECT 'roles', COUNT(*)::BIGINT FROM roles
UNION ALL SELECT 'user_roles', COUNT(*)::BIGINT FROM user_roles
UNION ALL SELECT 'user_identities', COUNT(*)::BIGINT FROM user_identities
UNION ALL SELECT 'devices', COUNT(*)::BIGINT FROM devices
UNION ALL SELECT 'partners', COUNT(*)::BIGINT FROM partners
UNION ALL SELECT 'merchants', COUNT(*)::BIGINT FROM merchants
UNION ALL SELECT 'addresses', COUNT(*)::BIGINT FROM addresses
UNION ALL SELECT 'order_groups', COUNT(*)::BIGINT FROM order_groups
UNION ALL SELECT 'wallets', COUNT(*)::BIGINT FROM wallets
UNION ALL SELECT 'ledger_entries', COUNT(*)::BIGINT FROM ledger_entries
UNION ALL SELECT 'payments', COUNT(*)::BIGINT FROM payments
ORDER BY entity;

-- 2. Duplicate phone candidates after E.164 normalization. Any returned row is a
--    manual reconciliation blocker; never merge user IDs automatically.
SELECT normalized_phone, COUNT(*) AS account_count,
       ARRAY_AGG(id ORDER BY id) AS user_ids
FROM (
  SELECT id,
         CASE
           WHEN phone ~ '^[+]91[6-9][0-9]{9} THEN phone
           WHEN phone ~ '^91[6-9][0-9]{9}$' THEN '+' || phone
           WHEN phone ~ '^[6-9][0-9]{9}$' THEN '+91' || phone
           ELSE NULL
         END AS normalized_phone
  FROM users
  WHERE phone IS NOT NULL
) candidates
WHERE normalized_phone IS NOT NULL
GROUP BY normalized_phone
HAVING COUNT(*) > 1;

-- 3. Duplicate email candidates. Any returned row needs manual identity review.
SELECT LOWER(BTRIM(email)) AS normalized_email,
       COUNT(*) AS account_count,
       ARRAY_AGG(id ORDER BY id) AS user_ids
FROM users
WHERE email IS NOT NULL
GROUP BY LOWER(BTRIM(email))
HAVING COUNT(*) > 1;

-- 4. Conflicting linked identifiers: one phone/email identity mapped to multiple users.
SELECT provider, provider_account_id, COUNT(DISTINCT user_id) AS account_count,
       ARRAY_AGG(DISTINCT user_id ORDER BY user_id) AS user_ids
FROM user_identities
WHERE provider IN ('phone', 'email')
GROUP BY provider, provider_account_id
HAVING COUNT(DISTINCT user_id) > 1;

-- 5. Admin account candidates. Review privately; do not expose identifiers in logs.
SELECT u.id, u.status, u.phone_verified, u.email_verified,
       ARRAY_AGG(DISTINCT r.name ORDER BY r.name) AS roles
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE r.name IN ('ADMIN', 'SUPER_ADMIN')
GROUP BY u.id, u.status, u.phone_verified, u.email_verified
ORDER BY u.id;

-- 6. Existing partner grants without an approved/active partner profile.
SELECT u.id AS user_id, p.status AS partner_status
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id AND r.name = 'PARTNER'
LEFT JOIN partners p ON p.user_id = u.id
WHERE p.id IS NULL OR p.status NOT IN ('APPROVED', 'ACTIVE');

-- 7. Existing merchant grants without an approved/live owned merchant profile.
SELECT u.id AS user_id, m.id AS merchant_id, m.status AS merchant_status
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id AND r.name IN ('MERCHANT', 'MERCHANT_ADMIN')
LEFT JOIN merchants m ON m.owner_id = u.id
WHERE m.id IS NULL OR m.status NOT IN ('APPROVED', 'LIVE');

-- 8. New migration structures. Before allowlist population, this must be empty.
SELECT COUNT(*) AS admin_identity_allowlist_rows
FROM admin_identity_allowlist;

-- 9. Role grant audit table must remain append-only at the application layer.
SELECT COUNT(*) AS role_grant_audit_rows
FROM auth_role_grant_audit;
 THEN phone
           WHEN phone ~ '^91[6-9][0-9]{9}$' THEN '+' || phone
           WHEN phone ~ '^[6-9][0-9]{9}$' THEN '+91' || phone
           ELSE NULL
         END AS normalized_phone
  FROM users
  WHERE phone IS NOT NULL
) candidates
WHERE normalized_phone IS NOT NULL
GROUP BY normalized_phone
HAVING COUNT(*) > 1;

-- 3. Duplicate email candidates. Any returned row needs manual identity review.
SELECT LOWER(BTRIM(email)) AS normalized_email,
       COUNT(*) AS account_count,
       ARRAY_AGG(id ORDER BY id) AS user_ids
FROM users
WHERE email IS NOT NULL
GROUP BY LOWER(BTRIM(email))
HAVING COUNT(*) > 1;

-- 4. Conflicting linked identifiers: one phone/email identity mapped to multiple users.
SELECT provider, provider_account_id, COUNT(DISTINCT user_id) AS account_count,
       ARRAY_AGG(DISTINCT user_id ORDER BY user_id) AS user_ids
FROM user_identities
WHERE provider IN ('phone', 'email')
GROUP BY provider, provider_account_id
HAVING COUNT(DISTINCT user_id) > 1;

-- 5. Admin account candidates. Review privately; do not expose identifiers in logs.
SELECT u.id, u.status, u.phone_verified, u.email_verified,
       ARRAY_AGG(DISTINCT r.name ORDER BY r.name) AS roles
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE r.name IN ('ADMIN', 'SUPER_ADMIN')
GROUP BY u.id, u.status, u.phone_verified, u.email_verified
ORDER BY u.id;

-- 6. Existing partner grants without an approved/active partner profile.
SELECT u.id AS user_id, p.status AS partner_status
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id AND r.name = 'PARTNER'
LEFT JOIN partners p ON p.user_id = u.id
WHERE p.id IS NULL OR p.status NOT IN ('APPROVED', 'ACTIVE');

-- 7. Existing merchant grants without an approved/live owned merchant profile.
SELECT u.id AS user_id, m.id AS merchant_id, m.status AS merchant_status
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id AND r.name IN ('MERCHANT', 'MERCHANT_ADMIN')
LEFT JOIN merchants m ON m.owner_id = u.id
WHERE m.id IS NULL OR m.status NOT IN ('APPROVED', 'LIVE');

-- 8. New migration structures. Before allowlist population, this must be empty.
SELECT COUNT(*) AS admin_identity_allowlist_rows
FROM admin_identity_allowlist;

-- 9. Role grant audit table must remain append-only at the application layer.
SELECT COUNT(*) AS role_grant_audit_rows
FROM auth_role_grant_audit;
