import { test } from 'node:test';
import assert from 'node:assert/strict';
import { denialDiagnostics } from './run-recovery.mjs';

test('preflight and additional denials remain distinct without reducing the original count',()=>{
  const evidence=denialDiagnostics({denied:2,denialRecordsTruncated:false,denialRecords:[
    {sequence:1,method:'POST',route:'/api/v1/billing/documents/{id}/send'},
    {sequence:2,method:'GET',route:'/api/v1/dashboard/summary'}]});
  assert.equal(evidence.total,2);
  assert.deepEqual(evidence.records.map(r=>r.context),['expected-preflight','additional-denial']);
});
test('unsafe or unbounded diagnostic data cannot enter sanitized evidence',()=>{
  for(const route of ['/api/v1/users/customer@example.test','/api/v1/sales?token=private','/api/v1/sales/123'])
    assert.throws(()=>denialDiagnostics({denied:1,denialRecordsTruncated:false,denialRecords:[{sequence:1,method:'GET',route}]}),/QA_DENIAL_DIAGNOSTICS_UNSAFE/);
  assert.throws(()=>denialDiagnostics({denied:40,denialRecordsTruncated:true,denialRecords:Array(33).fill({sequence:1,method:'GET',route:'/api'})}),/QA_DENIAL_DIAGNOSTICS_INVALID/);
});
