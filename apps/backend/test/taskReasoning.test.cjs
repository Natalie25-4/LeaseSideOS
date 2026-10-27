const { test } = require('node:test');
const assert = require('node:assert/strict');
const { explainTaskUrgency } = require('../dist/services/taskReasoning');
const { scanLeasesForKeyDates } = require('../dist/services/keyDateDetection');
const { getAllTasks, replaceAllTasks } = require('../dist/data/taskStore');
const { setLeasesForTesting } = require('../dist/data/leaseStore');
for (const [event,c,h,m,action] of [['rent_review',7,30,60,'prepare for the rent review'],['renewal_option',14,45,75,'notice requirements'],['expiry',14,30,60,'next steps for the tenancy']]) {
 test(`${event}: priority boundaries and relevant action`,()=>{
  for(const [days,level] of [[c,'Critical'],[c+1,'High'],[h,'High'],[h+1,'Medium'],[m,'Medium'],[m+1,'Low']]) {
   const reason=explainTaskUrgency(event,days);
   assert.ok(reason.includes(`in ${days} days`));
   assert.ok(reason.includes(`This is ${level} because`));
   assert.ok(reason.includes(action));
   assert.match(reason,/current priority rules/);
  }
 });
}
test('today, overdue, singular and invalid input',()=>{
 assert.match(explainTaskUrgency('expiry',0),/is today.*Critical/);
 assert.match(explainTaskUrgency('expiry',-1),/passed 1 day ago.*Critical/);
 assert.match(explainTaskUrgency('renewal_option',1),/recorded renewal option date is in 1 day[.]/);
 for(const n of [NaN,Infinity,1.5]) assert.throws(()=>explainTaskUrgency('expiry',n));
});
test('reasons update across priority boundaries and overdue rescans',()=>{
 replaceAllTasks([]);
 setLeasesForTesting([{id:'r',propertyId:'p',propertyName:'Office',tenantName:'Tenant',landlordName:'Owner',startDate:'2025-01-01',endDate:'2026-10-01',rentAmount:100,status:'active'}]);
 const day=s=>new Date(`${s}T12:00:00`);
 assert.match(scanLeasesForKeyDates(day('2026-09-01'))[0].reason,/in 30 days.*This is High/);
 const later=getAllTasks(day('2026-09-17'))[0];
 assert.equal(later.urgency,'critical');
 assert.match(later.reason,/in 14 days.*This is Critical/);
 assert.match(scanLeasesForKeyDates(day('2026-10-02'))[0].reason,/passed 1 day ago/);
 replaceAllTasks([]);setLeasesForTesting([]);
});
