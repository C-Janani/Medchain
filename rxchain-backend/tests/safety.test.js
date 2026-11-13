const assert=require('assert');
const P=require('../utils/parse');
const S=require('../utils/safety');
const A=require('../utils/aiAnalysis');
// parse
assert.strictEqual(P.parseDoseMg('500mg'),500);
assert.strictEqual(P.parseDoseMg('1 g'),1000);
assert.strictEqual(P.parseDoseMg('2 x 250mg'),500);
assert.strictEqual(P.parseDoseMg('250-500 mg'),500);
assert.strictEqual(P.parseDoseMg('100mcg'),0.1);
assert.strictEqual(P.parseDoseMg('1 tablet'),null);
const f=(x)=>P.parseTimesPerDay(x);
assert.strictEqual(f('3x daily'),3); assert.strictEqual(f('1x daily'),1); assert.strictEqual(f('twice daily'),2);
assert.strictEqual(f('TDS'),3); assert.strictEqual(f('1-0-1'),2); assert.strictEqual(f('0-0-1'),1); assert.strictEqual(f('every 8 hours'),3);
assert.strictEqual(f('q6h'),4); assert.strictEqual(f('morning and night'),2); assert.strictEqual(f('SOS'),null); assert.strictEqual(f('once daily'),1);
assert.strictEqual(f('four times a day'),4); assert.strictEqual(f('2 times a day'),2); assert.strictEqual(f(''),null);
assert.strictEqual(P.parseDurationDays('7 days'),7); assert.strictEqual(P.parseDurationDays('2 weeks'),14); assert.strictEqual(P.parseDurationDays('1 month'),30); assert.strictEqual(P.parseDurationDays('10d'),10); assert.strictEqual(P.parseDurationDays('until better'),null);
assert.strictEqual(P.ageFromDob('2000-01-01',new Date('2026-10-10')),26);
assert.strictEqual(P.ageFromDob('2000-12-01',new Date('2026-10-10')),25);
// resolve
const R=S.resolveMedicine;
assert.deepStrictEqual(R('Paracetamol 500mg tablet'),['paracetamol']);
assert.deepStrictEqual(R('Dolo 650'),['paracetamol']);
assert.deepStrictEqual(R('Crocin'),['paracetamol']);
assert.deepStrictEqual(R('Combiflam'),['ibuprofen','paracetamol']);
assert.deepStrictEqual(R('Paracetmol'),['paracetamol']);   // typo
assert.deepStrictEqual(R('Augmentin 625'),['amoxicillin']);
assert.deepStrictEqual(R('Pan 40'),['pantoprazole']);
assert.deepStrictEqual(R('Xyzzyquin'),[]);
// interactions
let w=S.checkInteractions([{name:'Warfarin'},{name:'Aspirin'}]);
assert.strictEqual(w.length,1); assert.strictEqual(w[0].severity,'high'); assert.strictEqual(w[0].category,'interaction');
w=S.checkInteractions([{name:'Ibuprofen'},{name:'Diclofenac'}]);
assert.strictEqual(w.length,1); assert.strictEqual(w[0].category,'duplicate'); assert.strictEqual(w[0].severity,'high');
w=S.checkInteractions([{name:'Aspirin'},{name:'Ibuprofen'}]);
assert.strictEqual(w.length,1); assert.strictEqual(w[0].category,'interaction'); assert.strictEqual(w[0].severity,'medium');
w=S.checkInteractions([{name:'Paracetamol'},{name:'Crocin'}]);
assert.strictEqual(w[0].category,'duplicate'); assert.strictEqual(w[0].severity,'high');
w=S.checkInteractions([{name:'Paracetamol'},{name:'Amoxicillin'}]); assert.strictEqual(w.length,0);
w=S.checkInteractions([{name:'Salbutamol'},{name:'Atenolol'}]); assert.strictEqual(w[0].severity,'high');
w=S.checkInteractions([{name:'Omeprazole'},{name:'Pantoprazole'}]); assert.strictEqual(w[0].category,'duplicate'); assert.strictEqual(w[0].severity,'medium');
w=S.checkInteractions([{name:'Atorvastatin'},{name:'Clarithromycin'}]); assert.strictEqual(w[0].severity,'high');
w=S.checkInteractions([{name:'Ibuprofen'}],[{name:'Warfarin',source:'RX-1'}]); assert.strictEqual(w[0].severity,'high'); assert.ok(/active prescription/.test(w[0].reason));
w=S.checkInteractions([{name:'Combiflam'},{name:'Paracetamol'}]); assert.ok(w.some(x=>x.category==='duplicate'&&x.severity==='high'));
// allergies
w=S.checkAllergies([{name:'Amoxicillin'}],['Penicillin']); assert.strictEqual(w[0].severity,'high'); assert.strictEqual(w[0].category,'allergy');
w=S.checkAllergies([{name:'Cefixime'}],['penicillin allergy']); assert.strictEqual(w[0].severity,'medium');
w=S.checkAllergies([{name:'Ibuprofen'}],['NSAIDs']); assert.strictEqual(w[0].severity,'high');
w=S.checkAllergies([{name:'Aspirin'}],['sulfa drugs']); assert.strictEqual(w.length,0);
w=S.checkAllergies([{name:'Glimepiride'}],['Sulfa']); assert.strictEqual(w[0].severity,'high');
w=S.checkAllergies([{name:'Paracetamol'}],['none']); assert.strictEqual(w.length,0);
w=S.checkAllergies([{name:'Paracetamol'}],['Dust','Peanuts']); assert.strictEqual(w.length,0);
w=S.checkAllergies([{name:'Crocin'}],['paracetamol']); assert.strictEqual(w[0].severity,'high');
w=S.checkAllergies([{name:'Azithral'}],['Azithromycin']); assert.strictEqual(w[0].severity,'high');
// dosage
w=S.checkDosage([{name:'Paracetamol',dosage:'1000mg',frequency:'5x daily'}],30); assert.ok(w.some(x=>x.category==='dosage'&&x.severity==='high'));
w=S.checkDosage([{name:'Paracetamol',dosage:'500mg',frequency:'3x daily'}],30); assert.strictEqual(w.length,0);
w=S.checkDosage([{name:'Paracetamol',dosage:'500mg',frequency:'3x daily'}],6); assert.strictEqual(w[0].category,'age');assert.strictEqual(w[0].severity,'medium');
w=S.checkDosage([{name:'Paracetamol',dosage:'1000mg',frequency:'3x daily'}],6); assert.strictEqual(w[0].severity,'high');
w=S.checkDosage([{name:'Aspirin',dosage:'75mg',frequency:'1x daily'}],12); assert.ok(w.some(x=>/Reye/.test(x.reason)));
w=S.checkDosage([{name:'Ibuprofen',dosage:'400mg',frequency:'3x daily'}],70); assert.ok(w.some(x=>x.category==='age'));
w=S.checkDosage([{name:'Diclofenac',dosage:'50mg',frequency:'4x daily'}],40); assert.ok(w.some(x=>x.severity==='high'));
w=S.checkDosage([{name:'Amlodipine',dosage:'5mg',frequency:'SOS'}],40); assert.strictEqual(w.length,0);
// screen + analysis
let r=S.screenPrescription({medicines:[{name:'Amoxicillin',dosage:'500mg',frequency:'3x daily'}],allergies:['Penicillin'],age:30});
assert.ok(r.blocking); assert.strictEqual(r.risk,'high');
r=S.screenPrescription({medicines:[{name:'Paracetamol',dosage:'500mg',frequency:'3x daily'},{name:'Mystery'}],age:30});
assert.ok(!r.blocking); assert.deepStrictEqual(r.unrecognised,['Mystery']); assert.strictEqual(r.risk,'low');
const a=A.analyzePrescription({newMedicines:[{name:'Paracetamol',dosage:'500mg',frequency:'3x daily',duration:'3 days'}],previousMedicines:['Paracetamol'],allergies:[],age:30});
assert.strictEqual(a.warnings.length,1); assert.strictEqual(a.warnings[0].category,'history'); assert.strictEqual(a.risk,'low');
assert.deepStrictEqual(S.suggestMedicines('para').map(x=>x.name),['Paracetamol']);
assert.ok(S.suggestMedicines('dol').length===1);
console.log('ALL SAFETY/PARSE TESTS PASSED');
