const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { classifyUrgency, daysUntil } = require('../dist/services/taskUrgency');
const { scanLeasesForKeyDates } = require('../dist/services/keyDateDetection');
const { getAllTasks, replaceAllTasks } = require('../dist/data/taskStore');
const { setLeasesForTesting } = require('../dist/data/leaseStore');
const express = require('express');
const router = require('../dist/routes/tasks').default;

const day = (date) => new Date(`${date}T12:00:00`);
const lease = { id: 'test', propertyId: 'p', propertyName: 'Property', tenantName: 'Tenant',
  landlordName: 'Landlord', startDate: '2025-01-01', endDate: '2026-10-01', rentAmount: 100, status: 'active' };
beforeEach(() => { replaceAllTasks([]); setLeasesForTesting([]); });

for (const [event, cutoffs] of Object.entries({rent_review: [7,30,60], renewal_option: [14,45,75], expiry: [14,30,60]})) {
  test(`${event}: inclusive boundaries, future, today and overdue`, () => {
    const [c,h,m] = cutoffs;
    for (const [days, expected] of [[-1,'critical'],[0,'critical'],[c,'critical'],[c+1,'high'],
      [h,'high'],[h+1,'medium'],[m,'medium'],[m+1,'low'],[100,'low']]) {
      assert.equal(classifyUrgency(event, days), expected, `${event} ${days}`);
    }
  });
}
test('calendar dates handle DST, leap years and invalid inputs', () => {
  assert.equal(daysUntil('2026-09-28', day('2026-09-26')), 2);
  assert.equal(daysUntil('2028-03-01', day('2028-02-28')), 2);
  for (const date of ['2026-02-30', 'invalid', '2026-13-01']) assert.throws(() => daysUntil(date, new Date()));
  assert.throws(() => classifyUrgency('expiry', NaN));
});
test('scan adds all three urgency levels and re-evaluates on reads', () => {
  setLeasesForTesting([{...lease, rentReviewDate:'2026-10-20', renewalOptionDate:'2026-10-30'}]);
  const tasks = scanLeasesForKeyDates(day('2026-09-01'));
  assert.equal(tasks.length, 3);
  assert.equal(tasks.find(t=>t.eventType==='expiry').urgency, 'high');
  assert.equal(getAllTasks(day('2026-09-17')).find(t=>t.eventType==='expiry').urgency, 'critical');
});
test('daily rescan retains overdue task without duplicating it; changed dates remove it', () => {
  setLeasesForTesting([lease]);
  scanLeasesForKeyDates(day('2026-10-01'));
  for (let i=0;i<2;i++) {
    const tasks=scanLeasesForKeyDates(day('2026-10-02'));
    assert.equal(tasks.length,1);
    assert.equal(tasks[0].urgency,'critical');
    assert.equal(tasks[0].daysUntilEvent,-1);
    assert.match(tasks[0].description,/overdue/);
  }
  setLeasesForTesting([{...lease,endDate:'2027-10-01'}]);
  assert.deepEqual(scanLeasesForKeyDates(day('2026-10-02')),[]);
});
test('empty portfolio, outside window and malformed dates produce no tasks', () => {
  assert.deepEqual(scanLeasesForKeyDates(day('2026-01-01')),[]);
  setLeasesForTesting([{...lease,endDate:'2027-01-01',rentReviewDate:'2026-02-30'}]);
  assert.deepEqual(scanLeasesForKeyDates(day('2026-01-01')),[]);
});
test('HTTP scan and list expose urgency sorted before days remaining', async () => {
  const dateIn = n => { const d=new Date(); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  setLeasesForTesting([{...lease,endDate:dateIn(100),rentReviewDate:dateIn(10),renewalOptionDate:dateIn(14)}]);
  const app=express(); app.use(router);
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const url=`http://127.0.0.1:${server.address().port}`;
    for (const [path,method] of [['/tasks/scan','POST'],['/tasks','GET']]) {
      const response=await fetch(url+path,{method});
      assert.equal(response.status,200);
      const {tasks}=await response.json();
      assert.deepEqual(tasks.map(t=>t.urgency),['critical','high']);
      assert.equal(tasks[0].eventType,'renewal_option');
    }
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
