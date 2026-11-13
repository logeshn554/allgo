import pg from 'pg';
import assert from 'node:assert';

async function main() {
  const client = new pg.Client('postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev');
  await client.connect();
  console.log('[CONNECTED] Connected to live PostgreSQL database.');

  // 1. Verify tables exist
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN (
      'document_upload_tickets', 'partner_service_applications', 'merchant_documents'
    );
  `);
  const tableNames = tables.rows.map(r => r.table_name);
  console.log('Verified Phase 2 tables:', tableNames);
  assert.strictEqual(tableNames.length, 3);

  // 2. Verify columns on partner_documents
  const pCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'partner_documents' AND column_name IN ('version', 'is_current', 'superseded_by', 'deleted_at');
  `);
  console.log('Verified partner_documents versioning columns:', pCols.rows.map(r => r.column_name));
  assert.strictEqual(pCols.rows.length, 4);

  // 3. Verify columns on outlets
  const oCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'outlets' AND column_name = 'outlet_status';
  `);
  console.log('Verified outlets outlet_status column:', oCols.rows.map(r => r.column_name));
  assert.strictEqual(oCols.rows.length, 1);

  // 4. Verify unique current-document indexes
  const indexes = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE tablename IN ('partner_documents', 'merchant_documents') 
    AND indexname IN ('idx_partner_doc_current', 'idx_merchant_doc_current');
  `);
  console.log('Verified unique current-doc indexes:', indexes.rows.map(r => r.indexname));
  assert.strictEqual(indexes.rows.length, 2);

  // 5. Verify audit immutability trigger directly
  console.log('Testing audit_logs immutability trigger...');
  const insertAudit = await client.query(`
    INSERT INTO audit_logs (action, entity_type, entity_id, reason)
    VALUES ('LIVE_TEST_ACTION', 'test_resource', 'res_123', 'Initial insert verification')
    RETURNING id;
  `);
  const auditId = insertAudit.rows[0].id;
  console.log(`Inserted test audit entry: ${auditId}`);

  // Test UPDATE rejection
  let updateBlocked = false;
  try {
    await client.query(`UPDATE audit_logs SET reason = 'Tampered' WHERE id = $1;`, [auditId]);
  } catch (err: any) {
    if (err.message.includes('immutable audit trail')) {
      updateBlocked = true;
      console.log('[PASS] UPDATE rejected by trigger:', err.message);
    } else {
      throw err;
    }
  }
  assert.ok(updateBlocked, 'Trigger must reject UPDATE on audit_logs');

  // Test DELETE rejection
  let deleteBlocked = false;
  try {
    await client.query(`DELETE FROM audit_logs WHERE id = $1;`, [auditId]);
  } catch (err: any) {
    if (err.message.includes('immutable audit trail')) {
      deleteBlocked = true;
      console.log('[PASS] DELETE rejected by trigger:', err.message);
    } else {
      throw err;
    }
  }
  assert.ok(deleteBlocked, 'Trigger must reject DELETE on audit_logs');

  console.log('\n[ALL LIVE DATABASE SCHEMA & TRIGGER CHECKS PASSED]');
  await client.end();
}

main().catch(err => {
  console.error('[FAILED]', err);
  process.exit(1);
});
