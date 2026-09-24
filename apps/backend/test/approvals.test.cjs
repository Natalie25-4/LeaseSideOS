const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const store = require('../dist/data/maintenanceStore');
const approvals = require('../dist/routes/approvals');
let folder, server, base, request;
const token = 'test-only-approval-token-01234567890123456789';
beforeEach(async () => {
  folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lease-approval-'));
  process.env.APPROVAL_STORE_PATH = path.join(folder, 'store.json');
  process.env.PM_APPROVAL_TOKEN = token;
  process.env.PM_APPROVER_ID = 'test-pm';
  request = store.addRequest({ leaseId: 'l', propertyId: 'p', propertyName: 'Property', tenantName: 'Tenant', description: 'Repair leak' });
  const app = express(); app.use(express.json());
  app.use(require('../dist/routes/maintenance').default);
  app.use(approvals.default); app.use(approvals.approvalErrorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(folder, { recursive: true, force: true }); });
async function call(url, method='GET', body, key=token) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, ...(body ? {body: JSON.stringify(body)} : {}) });
  return { status: response.status, body: await response.json() };
}
async function propose(change = { assignedTo: 'Plumber' }) {
  return call(`/maintenance/${request.id}/${change.status ? 'status' : 'assign'}`, 'PATCH', change);
}
test('public mutation routes only propose, including forged approval fields', async () => {
  const result = await propose({ assignedTo: 'Plumber', approved: true, state: 'executed' });
  assert.equal(result.status, 202); assert.equal(result.body.action.state, 'pending');
  assert.deepEqual(store.getRequestById(request.id), request);
  assert.equal((await propose({ status: 'resolved' })).status, 202);
  assert.deepEqual(store.getRequestById(request.id), request);
});
test('PM access fails closed for missing, incorrect or unconfigured credentials', async () => {
  const {body} = await propose();
  for (const key of ['', 'wrong']) {
    assert.equal((await call('/approvals', 'GET', undefined, key)).status, 401);
    assert.equal((await call(`/approvals/${body.action.id}/decision`, 'POST', {decision:'approve'}, key)).status, 401);
  }
  delete process.env.PM_APPROVAL_TOKEN;
  assert.equal((await call('/approvals')).status, 503);
  assert.equal(store.getRequestById(request.id).status, 'logged');
});
test('approval applies stored payload once and records server identity', async () => {
  const { body } = await propose(); const url = `/approvals/${body.action.id}/decision`;
  const result = await call(url, 'POST', { decision:'approve', assignedTo:'Attacker', actor:'Forged' });
  assert.equal(result.status, 200); assert.equal(result.body.request.assignedTo, 'Plumber');
  assert.equal(result.body.action.decidedBy, 'test-pm');
  assert.equal((await call(url, 'POST', {decision:'approve'})).status, 409);
  assert.deepEqual(store.listApprovals().audit.map(a=>a.event), ['proposed','approved','executed']);
});
test('rejection never mutates request and cannot later be approved', async () => {
  const {body} = await propose(); const url = `/approvals/${body.action.id}/decision`;
  assert.equal((await call(url,'POST',{decision:'reject',reason:'No work needed'})).body.action.state, 'rejected');
  assert.deepEqual(store.getRequestById(request.id), request);
  assert.equal((await call(url,'POST',{decision:'approve'})).status,409);
});
test('stale proposal cannot overwrite a later decision', async () => {
  const first = (await propose()).body.action;
  const second = (await propose({status:'resolved'})).body.action;
  assert.equal((await call(`/approvals/${first.id}/decision`,'POST',{decision:'approve'})).status,200);
  assert.equal((await call(`/approvals/${second.id}/decision`,'POST',{decision:'approve'})).status,409);
  assert.equal(store.getRequestById(request.id).status,'assigned');
});
test('repeated proposals reuse pending action', async () => {
  assert.equal((await propose()).body.action.id,(await propose()).body.action.id);
  assert.equal(store.listApprovals().audit.length,1);
});
test('invalid action data and decisions are rejected', async () => {
  assert.equal((await propose({assignedTo:42})).status,400);
  assert.equal((await propose({status:'paid'})).status,400);
  assert.equal((await call('/maintenance/missing/assign','PATCH',{assignedTo:'A'})).status,404);
  const action=(await propose()).body.action;
  assert.equal((await call(`/approvals/${action.id}/decision`,'POST',{decision:'execute'})).status,400);
  assert.equal(store.getRequestById(request.id).status,'logged');
});
test('persistent decision and audit survive module reload', async () => {
  const action=(await propose()).body.action;
  await call(`/approvals/${action.id}/decision`,'POST',{decision:'approve'});
  delete require.cache[require.resolve('../dist/data/maintenanceStore')];
  const reloaded=require('../dist/data/maintenanceStore');
  assert.equal(reloaded.getRequestById(request.id).assignedTo,'Plumber');
  assert.equal(reloaded.listApprovals().audit.length,3);
});
test('writer lock fails closed without changing stored request', async () => {
  fs.writeFileSync(process.env.APPROVAL_STORE_PATH+'.lock','');
  assert.equal((await propose()).status,503);
  assert.deepEqual(store.getRequestById(request.id),request);
});
test('corrupt data is not silently replaced', () => {
  fs.writeFileSync(process.env.APPROVAL_STORE_PATH,'broken');
  assert.throws(()=>store.proposeAction(request.id,{type:'status',status:'resolved'}));
  assert.equal(fs.readFileSync(process.env.APPROVAL_STORE_PATH,'utf8'),'broken');
});
test('simultaneous approval requests apply a status change only once', async () => {
  const action = (await propose({status:'resolved'})).body.action;
  const url = `/approvals/${action.id}/decision`;
  const results = await Promise.all([call(url,'POST',{decision:'approve'}),call(url,'POST',{decision:'approve'})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal(store.getRequestById(request.id).status,'resolved');
  assert.equal(store.listApprovals().audit.filter(e=>e.event==='executed').length,1);
});
