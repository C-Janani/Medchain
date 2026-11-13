const assert=require('assert');
const B=require('path').join(__dirname,'..','utils')+require('path').sep;
const BC=require(B+'blockchain'), I=require(B+'integrity'), F=require(B+'fraud'), SC=require(B+'schedule');

/* ---------- integrity ---------- */
function mkChain(n){
  const blocks=[BC.createGenesisBlock()];
  for(let i=1;i<=n;i++){
    blocks.push(BC.createNextBlock({type:'PRESCRIPTION',prescriptionId:'RX-'+i,patientId:'PAT-1',doctorId:'DOC-1',diagnosis:'Fever',
      medicines:[{name:'Paracetamol',dosage:'500mg',duration:'3 days',frequency:'3x daily'}],issuedAt:new Date()},blocks[i-1]));
  }
  return blocks;
}
const clone=(x)=>JSON.parse(JSON.stringify(x),(k,v)=>(k==='timestamp'||k==='issuedAt')&&typeof v==='string'?new Date(v):v);
const mkRx=(blocks)=>blocks.slice(1).map(b=>({prescriptionId:b.data.prescriptionId,diagnosis:'Fever',patient:{registrationId:'PAT-1'},doctor:{registrationId:'DOC-1'},
  medicines:[{name:'Paracetamol',dosage:'500mg',duration:'3 days',frequency:'3x daily'}],blockchain:{blockIndex:b.index,blockHash:b.hash}}));

let blocks=mkChain(4), rx=mkRx(blocks);
let r=I.verifyLedger(clone(blocks),rx);
assert.strictEqual(r.status,'intact'); assert.strictEqual(r.blocksChecked,5); assert.strictEqual(r.prescriptionsChecked,4);

// 1) tamper block data
let b2=clone(blocks); b2[2].data.medicines[0].dosage='5000mg';
r=I.verifyLedger(b2,rx); assert.strictEqual(r.status,'compromised'); assert.ok(r.issues.some(i=>i.code==='BAD_HASH'&&i.blockIndex===2));
// 2) tamper DB record only
let rx2=JSON.parse(JSON.stringify(rx)); rx2[1].medicines[0].dosage='1000mg';
r=I.verifyLedger(clone(blocks),rx2); assert.strictEqual(r.status,'compromised'); assert.ok(r.issues.some(i=>i.code==='RECORD_MODIFIED'&&i.prescriptionId==='RX-2'));
// 3) delete a record -> orphan
r=I.verifyLedger(clone(blocks),rx.filter(x=>x.prescriptionId!=='RX-3')); assert.ok(r.issues.some(i=>i.code==='ORPHAN_BLOCK'&&i.prescriptionId==='RX-3'));
// 4) delete a block -> gap + broken link + missing
let b4=clone(blocks); b4.splice(2,1);
r=I.verifyLedger(b4,rx); const codes=r.issues.map(i=>i.code); assert.ok(codes.includes('INDEX_GAP')); assert.ok(codes.includes('BROKEN_LINK')); assert.ok(codes.includes('MISSING_BLOCK'));
// 5) re-hash a tampered block (attacker recomputes hash) -> link of next block breaks
let b5=clone(blocks); b5[2].data.diagnosis='Hacked'; b5[2].hash=BC.calculateHash(2,b5[2].timestamp,b5[2].data,b5[2].previousHash);
r=I.verifyLedger(b5,rx); assert.ok(r.issues.some(i=>i.code==='BROKEN_LINK'&&i.blockIndex===3)); assert.ok(r.issues.some(i=>i.code==='RECORD_MODIFIED'));
// 6) unsealed
r=I.verifyLedger(clone(blocks),[...rx,{prescriptionId:'RX-X',diagnosis:'',patient:{registrationId:'P'},doctor:{registrationId:'D'},medicines:[]}]); assert.ok(r.issues.some(i=>i.code==='UNSEALED')); assert.strictEqual(r.status,'warning');
// legacy hash blocks still verify
const g=BC.createGenesisBlock(); const legacy={index:1,timestamp:new Date(),data:{type:'PRESCRIPTION',prescriptionId:'RX-L'},previousHash:g.hash}; legacy.hash=BC.calculateLegacyHash(1,legacy.timestamp,legacy.data,legacy.previousHash);
assert.ok(BC.verifyBlock(legacy,g)); assert.strictEqual(I.verifyChain([g,legacy]).issues.length,0);
// timezone independence of the new hash
const ts=new Date('2026-10-10T05:00:00.123Z'); const h1=BC.calculateHash(1,ts,{a:1},'0');
const tzProc=require('child_process').execSync(`TZ=America/New_York node -e "const B=require('${B.replace(/\\/g,'/')}blockchain');console.log(B.calculateHash(1,new Date('2026-10-10T05:00:00.123Z'),{a:1},'0'))"`).toString().trim();
assert.strictEqual(h1,tzProc);

/* ---------- fraud ---------- */
const now=new Date('2026-10-10T12:00:00Z');
const mk=(id,doc,pat,meds,minAgo,extra={})=>({prescriptionId:id,doctor:{registrationId:doc,name:'Dr '+doc},patient:{registrationId:pat,name:'Pat '+pat},
  medicines:meds.map(n=>({name:n})),createdAt:new Date(now-minAgo*60000),status:'active',...extra});
// quiet baseline
let rxs=[mk('A1','DOC-1','PAT-1',['Paracetamol'],60*50),mk('A2','DOC-1','PAT-2',['Cetirizine'],60*30)];
let rep=F.computeFraud({prescriptions:rxs,auditLogs:[],integrity:null,now});
assert.strictEqual(rep.overall.score,0); assert.strictEqual(rep.overall.level,'low'); assert.strictEqual(rep.flags.length,0);
// burst + volume spike
rxs=[...rxs]; for(let i=0;i<9;i++) rxs.push(mk('B'+i,'DOC-2','PAT-'+(10+i),['Paracetamol'],i+1));
rep=F.computeFraud({prescriptions:rxs,auditLogs:[],integrity:null,now});
assert.ok(rep.flags.some(f=>f.code==='DOCTOR_VOLUME_SPIKE'&&f.severity==='high')); assert.ok(rep.flags.some(f=>f.code==='DOCTOR_BURST'));
assert.strictEqual(rep.entities[0].id,'DOC-2'); assert.strictEqual(rep.entities[0].score,50); assert.strictEqual(rep.entities[0].level,'medium');
// doctor shopping
rxs=[mk('C1','DOC-1','PAT-7',['Amoxicillin'],60*24*2),mk('C2','DOC-3','PAT-7',['Augmentin'],60*24)];
rep=F.computeFraud({prescriptions:rxs,auditLogs:[],integrity:null,now});
assert.ok(rep.flags.some(f=>f.code==='MULTI_DOCTOR_SAME_MEDICINE'&&f.entityId==='PAT-7'&&f.severity==='medium'));
// controlled + shopping = high
rxs=[mk('D1','DOC-1','PAT-8',['Tramadol'],60*24*2),mk('D2','DOC-3','PAT-8',['Tramadol'],60*24)];
rep=F.computeFraud({prescriptions:rxs,auditLogs:[],integrity:null,now});
const pf=rep.flags.find(f=>f.code==='MULTI_DOCTOR_SAME_MEDICINE'); assert.strictEqual(pf.severity,'high'); assert.strictEqual(rep.entities.find(e=>e.id==='PAT-8').score,40);
// same doctor twice is NOT shopping
rxs=[mk('E1','DOC-1','PAT-9',['Paracetamol'],60*24*2),mk('E2','DOC-1','PAT-9',['Paracetamol'],60*24)];
assert.ok(!F.computeFraud({prescriptions:rxs,auditLogs:[],integrity:null,now}).flags.some(f=>f.code==='MULTI_DOCTOR_SAME_MEDICINE'));
// pharmacy rapid dispense + audit
rxs=[]; for(let i=0;i<10;i++) rxs.push(mk('P'+i,'DOC-1','PAT-'+i,['Paracetamol'],500,{status:'dispensed',dispensedAt:new Date(now-(i*3)*60000),dispensedBy:{registrationId:'PHR-1',name:'City Care'}}));
const logs=[{action:'DUPLICATE_DISPENSE_ATTEMPT',actor:{registrationId:'PHR-1',name:'City Care',role:'pharmacy'},target:'P1',createdAt:new Date(now-1000)},
            {action:'DUPLICATE_DISPENSE_ATTEMPT',actor:{registrationId:'PHR-1',name:'City Care',role:'pharmacy'},target:'P2',createdAt:new Date(now-2000)},
            ...[1,2,3,4].map(i=>({action:'VERIFY_FAILED',actor:{registrationId:'PHR-9',name:'Shady',role:'pharmacy'},target:'X'+i,createdAt:new Date(now-i*1000)}))];
rep=F.computeFraud({prescriptions:rxs,auditLogs:logs,integrity:null,now});
assert.ok(rep.flags.some(f=>f.code==='PHARMACY_RAPID_DISPENSE'&&f.severity==='high')); assert.ok(rep.flags.some(f=>f.code==='DUPLICATE_DISPENSE_ATTEMPT'&&f.severity==='high'));
assert.ok(rep.flags.some(f=>f.code==='REPEATED_VERIFY_FAILURES'&&f.entityId==='PHR-9'));
assert.strictEqual(rep.entities.find(e=>e.id==='PHR-1').score,55);
// tampering -> overall 100
blocks=mkChain(2); rx=mkRx(blocks); rx[0].medicines[0].dosage='9999mg';
const integ=I.verifyLedger(clone(blocks),rx);
rxs=[mk('RX-1','DOC-1','PAT-1',['Paracetamol'],100)];
rep=F.computeFraud({prescriptions:rxs,auditLogs:[],integrity:integ,now});
assert.strictEqual(rep.overall.score,100); assert.ok(rep.overall.ledgerCompromised); assert.ok(rep.flags.some(f=>f.code==='LEDGER_TAMPERING'));

/* ---------- schedule ---------- */
assert.deepStrictEqual(SC.slotTimes('3x daily'),['08:00','14:00','20:00']);
assert.deepStrictEqual(SC.slotTimes('1-0-1'),['08:00','20:00']);
assert.deepStrictEqual(SC.slotTimes('0-0-1'),['20:00']);
assert.deepStrictEqual(SC.slotTimes('1x daily at night'),['21:00']);
assert.deepStrictEqual(SC.slotTimes('SOS'),[]);
assert.strictEqual(SC.slotTimes('6x daily').length,6);
assert.deepStrictEqual(SC.localParts(new Date('2026-10-10T05:00:00Z'),'Asia/Kolkata'),{date:'2026-10-10',time:'10:30'});
assert.deepStrictEqual(SC.localParts(new Date('2026-10-10T20:00:00Z'),'Asia/Kolkata'),{date:'2026-10-11',time:'01:30'});
// prescription created 2026-10-10 09:00 IST (03:30Z), 3x daily for 3 days
const rxS=[{prescriptionId:'RX-S',status:'active',createdAt:new Date('2026-10-10T03:30:00Z'),medicines:[{name:'Paracetamol',dosage:'500mg',frequency:'3x daily',duration:'3 days'}]}];
const doses=SC.buildDoses(rxS,'Asia/Kolkata');
assert.strictEqual(doses.length,2+3+3); // first day: 14:00 & 20:00 only (08:00 is before 09:00)
assert.strictEqual(doses[0].time,'14:00');
// now = day 2 at 15:00 IST ; took day1 14:00, skipped day1 20:00 ; day2 08:00 untouched
const nowS=new Date('2026-10-11T09:30:00Z'); // 15:00 IST
const logsS=[{prescriptionId:'RX-S',medicine:'Paracetamol',date:'2026-10-10',slot:'14:00',status:'taken'},{prescriptionId:'RX-S',medicine:'Paracetamol',date:'2026-10-10',slot:'20:00',status:'skipped'}];
const sum=SC.summarize(rxS,logsS,nowS,'Asia/Kolkata');
const st=Object.fromEntries(sum.today.map(d=>[d.time,d.status]));
assert.deepStrictEqual(st,{'08:00':'missed','14:00':'due','20:00':'upcoming'});
assert.strictEqual(sum.last7.taken,1); assert.strictEqual(sum.last7.skipped,1); assert.strictEqual(sum.last7.missed,1); assert.strictEqual(sum.last7.adherence,33);
assert.strictEqual(sum.perMedicine[0].adherence,33);
// no logs yet, right after prescribing -> nothing resolved -> adherence null
const early=SC.summarize(rxS,[],new Date('2026-10-10T03:35:00Z'),'Asia/Kolkata'); assert.strictEqual(early.last7.adherence,null);
console.log('ALL INTEGRITY / FRAUD / SCHEDULE TESTS PASSED');
