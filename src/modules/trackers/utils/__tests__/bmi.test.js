/** BMI body-composition insights — spec §2, §3, §9. */
module.exports = ({ bodyComposition: A, describe, eq }) => {
  const base = {
    bmi: 20.9, bmiLabel: 'Normal', bmiStatus: 'normal',
    idealRange: { minKg: 50.4, maxKg: 67.8 },
    heightCm: 165, weightKg: 56.8,
  };
  const rowFor = (input, key) => A.buildBodyInsights({ ...base, ...input }).find(r => r.key === key);

  describe('bmi · unit conversions');
  eq('kg to lbs', Math.round(A.kgToLbs(100) * 10) / 10, 220.5);
  eq('lbs to kg', Math.round(A.lbsToKg(220.462) * 10) / 10, 100);
  eq('round trip kg', Math.round(A.lbsToKg(A.kgToLbs(56.8)) * 10) / 10, 56.8);
  eq('cm to feet and inches', A.cmToFtIn(165), { ft: 5, inch: 5 });
  eq('feet and inches to cm', Math.round(A.ftInToCm(5, 5)), 165);
  eq('round trip height', Math.round(A.ftInToCm(A.cmToFtIn(180).ft, A.cmToFtIn(180).inch)), 180);

  describe('bmi · age from date of birth');
  eq('null without a dob', A.ageFromDob(''), null);
  eq('malformed dob', A.ageFromDob('not-a-date'), null);
  eq('a real dob yields a number', typeof A.ageFromDob('1990-01-01'), 'number');
  eq('and a plausible one', A.ageFromDob('1990-01-01') > 20, true);

  describe('bmi · published formulas');
  // Deurenberg (1991): 1.20·BMI + 0.23·age − 10.8·sex − 5.4
  eq('body fat, female 30y BMI 22', Math.round(A.bodyFatPct(22, 30, 'female') * 10) / 10, 27.9);
  eq('body fat, male is lower at the same BMI', A.bodyFatPct(22, 30, 'male') < A.bodyFatPct(22, 30, 'female'), true);
  eq('male differs by exactly the sex term',
    Math.round((A.bodyFatPct(22, 30, 'female') - A.bodyFatPct(22, 30, 'male')) * 10) / 10, 10.8);
  // Mifflin-St Jeor (1990)
  eq('BMR, female 165cm 57kg 30y', Math.round(A.bmrKcal(57, 165, 30, 'female')), 1290);
  eq('BMR, male is higher', A.bmrKcal(57, 165, 30, 'male') > A.bmrKcal(57, 165, 30, 'female'), true);
  eq('BMR falls with age', A.bmrKcal(57, 165, 50, 'female') < A.bmrKcal(57, 165, 30, 'female'), true);
  eq('body water is a positive number of litres', A.totalBodyWaterL(57, 165, 30, 'female') > 0, true);
  eq('and less than body weight', A.totalBodyWaterL(57, 165, 30, 'female') < 57, true);

  describe('bmi · insights need a profile before estimating');
  eq('no dob or sex → body fat needs profile', rowFor({}, 'bodyFat').state, 'needsProfile');
  eq('and carries no value', rowFor({}, 'bodyFat').value, null);
  eq('dob and sex → estimated', rowFor({ dob: '1996-01-01', sex: 'female' }, 'bodyFat').state, 'ok');
  eq('labelled as an estimate',
    rowFor({ dob: '1996-01-01', sex: 'female' }, 'bodyFat').source.startsWith('Estimated'), true);

  describe('bmi · a measured reading beats the estimate (§3, §9)');
  const withProfile = { dob: '1996-01-01', sex: 'female' };
  const measuredFat = rowFor({ ...withProfile, measured: { bodyFatPct: 24.5 } }, 'bodyFat');
  eq('uses the entered value', measuredFat.value, '24.5 %');
  eq('and says where it came from', measuredFat.source, 'From your measurement');
  eq('not the formula', measuredFat.source.includes('Deurenberg'), false);
  eq('works even without a profile',
    rowFor({ measured: { bodyFatPct: 24.5 } }, 'bodyFat').value, '24.5 %');
  eq('no reading → still estimated',
    rowFor({ ...withProfile, measured: {} }, 'bodyFat').source.startsWith('Estimated'), true);

  describe('bmi · visceral fat only exists when measured');
  eq('unavailable by default', rowFor({}, 'visceralFat').state, 'unavailable');
  eq('no value by default', rowFor({}, 'visceralFat').value, null);
  eq('measured turns it into a value', rowFor({ measured: { visceralFat: 6 } }, 'visceralFat').value, '6');
  eq('marked ok', rowFor({ measured: { visceralFat: 6 } }, 'visceralFat').state, 'ok');

  describe('bmi · bone mass only exists when measured');
  eq('unavailable by default', rowFor({}, 'boneMass').state, 'unavailable');
  eq('measured value in kg', rowFor({ measured: { boneMassKg: 2.4 } }, 'boneMass').value, '2.4 kg');
  eq('sourced from the measurement',
    rowFor({ measured: { boneMassKg: 2.4 } }, 'boneMass').source, 'From your measurement');

  describe('bmi · body water prefers the measurement');
  eq('estimated with a profile',
    rowFor(withProfile, 'bodyWater').source.startsWith('Estimated'), true);
  // 50% of 56.8 kg = 28.4 L
  eq('measured percentage converted to litres',
    rowFor({ ...withProfile, measured: { bodyWaterPct: 50 } }, 'bodyWater').value, '28.4 L');
  eq('sourced from the measurement',
    rowFor({ ...withProfile, measured: { bodyWaterPct: 50 } }, 'bodyWater').source, 'From your measurement');

  describe('bmi · measured muscle is its own row, not lean mass');
  eq('absent without a reading', rowFor(withProfile, 'muscleMass'), undefined);
  eq('present with one', rowFor({ measured: { muscleMassKg: 22.3 } }, 'muscleMass').value, '22.3 kg');
  eq('labelled skeletal muscle', rowFor({ measured: { muscleMassKg: 22.3 } }, 'muscleMass').label, 'Skeletal Muscle');
  eq('the lean-mass estimate still stands separately',
    rowFor({ ...withProfile, measured: { muscleMassKg: 22.3 } }, 'leanMass').state, 'ok');

  describe('bmi · rows are stable and keys unique');
  const rows = A.buildBodyInsights({ ...base, ...withProfile });
  eq('no duplicate keys', new Set(rows.map(r => r.key)).size, rows.length);
  eq('BMI status always first', rows[0].key, 'bmiStatus');
  eq('same shape with and without measurements',
    A.buildBodyInsights({ ...base, ...withProfile, measured: { bodyFatPct: 25 } })
      .filter(r => r.key !== 'muscleMass').length, rows.length);
};
