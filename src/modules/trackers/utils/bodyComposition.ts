/**
 * bodyComposition — estimated body metrics derived from height, weight, age and
 * sex using named, published formulas.
 *
 * Honesty rules baked into this module:
 *  - Every value is an ESTIMATE from a population formula, not a measurement.
 *    Each row carries the formula name so the UI can say where it came from.
 *  - Metrics that genuinely cannot be derived from height/weight (visceral fat
 *    level, bone mass) return `unavailable` with a reason instead of a number.
 *    Bioimpedance hardware is the only way to get those.
 *  - When age or sex is missing we return `needsProfile` rather than guessing.
 *
 * Formulas:
 *  - Body fat %      Deurenberg et al. (1991)
 *  - BMR             Mifflin-St Jeor (1990)
 *  - Total body water Watson et al. (1980)
 *  - Lean body mass  weight × (1 − bodyFat%)
 */

export type Sex = 'female' | 'male';
export type MetricStatus = 'low' | 'normal' | 'high' | 'info';

export interface BodyMetric {
  key:      string;
  label:    string;
  /** Formatted value, or null when it can't be computed. */
  value:    string | null;
  status:   MetricStatus;
  /** Short plain-language explanation of what the metric means. */
  explain:  string;
  /** Where the number came from, or why there isn't one. */
  source:   string;
  state:    'ok' | 'needsProfile' | 'unavailable';
}

/** Whole years between a YYYY-MM-DD date of birth and today. */
export function ageFromDob(dob: string): number | null {
  const d = new Date(dob + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** Deurenberg (1991). Returns body fat as a percentage of body mass. */
export function bodyFatPct(bmi: number, age: number, sex: Sex): number {
  const sexTerm = sex === 'male' ? 1 : 0;
  return (1.20 * bmi) + (0.23 * age) - (10.8 * sexTerm) - 5.4;
}

/** Mifflin-St Jeor (1990). Resting energy expenditure in kcal/day. */
export function bmrKcal(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return sex === 'male' ? base + 5 : base - 161;
}

/** Watson (1980). Total body water in litres. The female form has no age term. */
export function totalBodyWaterL(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return sex === 'male'
    ? 2.447 - (0.09156 * age) + (0.1074 * heightCm) + (0.3362 * weightKg)
    : -2.097 + (0.1069 * heightCm) + (0.2466 * weightKg);
}

/** ACE/ACSM-style body-fat bands, which differ by sex. */
function classifyBodyFat(pct: number, sex: Sex): MetricStatus {
  if (sex === 'female') {
    if (pct < 21) return 'low';
    if (pct <= 31) return 'normal';
    return 'high';
  }
  if (pct < 14) return 'low';
  if (pct <= 24) return 'normal';
  return 'high';
}

/** Total body water as a share of body mass — typical ranges differ by sex. */
function classifyWater(pct: number, sex: Sex): MetricStatus {
  const [lo, hi] = sex === 'female' ? [45, 60] : [50, 65];
  if (pct < lo) return 'low';
  if (pct > hi) return 'high';
  return 'normal';
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface BodyInsightInput {
  bmi:        number;
  bmiLabel:   string;
  bmiStatus:  MetricStatus;
  idealRange: { minKg: number; maxKg: number } | null;
  heightCm:   number;
  weightKg:   number;
  dob?:       string;
  sex?:       Sex;
  /**
   * Readings the user entered on the measurement itself.
   *
   * These take precedence over the formulas below wherever both exist: a
   * number off a body-composition scale is an actual measurement of this
   * person, while Deurenberg and Watson are population regressions that only
   * know height, weight, age and sex. Showing the estimate over the reading
   * would be presenting a guess in place of data.
   */
  measured?: {
    bodyFatPct?:   number;
    muscleMassKg?: number;
    visceralFat?:  number;
    bodyWaterPct?: number;
    boneMassKg?:   number;
  };
}

/**
 * Build the Body Insights rows. Always returns all eight in a stable order so
 * the card layout doesn't jump around — rows just carry different states.
 */
export function buildBodyInsights(input: BodyInsightInput): BodyMetric[] {
  const { bmi, bmiLabel, bmiStatus, idealRange, heightCm, weightKg, dob, sex } = input;
  const measured = input.measured ?? {};
  const age = dob ? ageFromDob(dob) : null;
  const canEstimate = age != null && !!sex && heightCm > 0 && weightKg > 0;

  const needsProfile = (key: string, label: string, explain: string): BodyMetric => ({
    key, label, value: null, status: 'info', explain, state: 'needsProfile',
    source: 'Add your date of birth and sex to estimate this.',
  });

  const rows: BodyMetric[] = [];

  rows.push({
    key: 'bmiStatus',
    label: 'BMI Status',
    value: bmiLabel,
    status: bmiStatus,
    explain: 'Where your weight sits relative to your height.',
    source: 'BMI = weight (kg) ÷ height (m)²',
    state: 'ok',
  });

  rows.push({
    key: 'idealWeight',
    label: 'Ideal Weight Range',
    value: idealRange ? `${round1(idealRange.minKg)} – ${round1(idealRange.maxKg)} kg` : null,
    status: 'info',
    explain: 'The weight range that puts your BMI between 18.5 and 24.9.',
    source: idealRange ? 'Derived from your height' : 'Log your height to calculate this.',
    state: idealRange ? 'ok' : 'needsProfile',
  });

  // A reading the user entered beats the formula, and says so — "Estimated"
  // under a number they measured themselves would be wrong twice over.
  if (measured.bodyFatPct != null) {
    rows.push({
      key: 'bodyFat',
      label: 'Body Fat',
      value: `${round1(measured.bodyFatPct)} %`,
      status: sex ? classifyBodyFat(measured.bodyFatPct, sex) : 'info',
      explain: 'Share of your body mass that is fat tissue.',
      source: 'From your measurement',
      state: 'ok',
    });
  } else if (canEstimate) {
    const bf = bodyFatPct(bmi, age!, sex!);
    rows.push({
      key: 'bodyFat',
      label: 'Body Fat',
      value: `${round1(Math.max(0, bf))} %`,
      status: classifyBodyFat(bf, sex!),
      explain: 'Estimated share of your body mass that is fat tissue.',
      source: 'Estimated — Deurenberg formula (1991)',
      state: 'ok',
    });
  } else {
    rows.push(needsProfile('bodyFat', 'Body Fat', 'Estimated share of your body mass that is fat tissue.'));
  }


  if (canEstimate) {
    const bmr = bmrKcal(weightKg, heightCm, age!, sex!);
    rows.push({
      key: 'bmr',
      label: 'Basal Metabolic Rate',
      value: `${Math.round(bmr)} kcal`,
      status: 'info',
      explain: 'Energy your body burns at complete rest over 24 hours.',
      source: 'Estimated — Mifflin-St Jeor formula (1990)',
      state: 'ok',
    });
  } else {
    rows.push(needsProfile('bmr', 'Basal Metabolic Rate', 'Energy your body burns at complete rest over 24 hours.'));
  }

  if (canEstimate) {
    const bf = bodyFatPct(bmi, age!, sex!);
    const lbm = weightKg * (1 - Math.max(0, Math.min(60, bf)) / 100);
    rows.push({
      key: 'leanMass',
      label: 'Muscle Mass',
      value: `${round1(lbm)} kg`,
      status: 'info',
      explain: 'Lean body mass — everything that is not fat, so it includes muscle plus bone, water and organs. Not muscle alone.',
      source: 'Estimated — weight × (1 − body fat %)',
      state: 'ok',
    });
  } else {
    rows.push(needsProfile('leanMass', 'Muscle Mass', 'Lean body mass — muscle plus bone, water and organs.'));
  }

  // A measured muscle mass is a different quantity from lean mass, so it gets
  // its own row rather than overwriting the estimate above — labelling a scale's
  // skeletal-muscle figure as "lean mass" would conflate two things.
  if (measured.muscleMassKg != null) {
    rows.push({
      key: 'muscleMass',
      label: 'Skeletal Muscle',
      value: `${round1(measured.muscleMassKg)} kg`,
      status: 'info',
      explain: 'Weight of your skeletal muscle alone, as reported by your scale.',
      source: 'From your measurement',
      state: 'ok',
    });
  }

  // Visceral fat has no formula at all — it only ever came from a scale, so a
  // user-entered reading turns this row from unavailable into a real value.
  rows.push(measured.visceralFat != null
    ? {
        key: 'visceralFat',
        label: 'Visceral Fat Level',
        value: String(round1(measured.visceralFat)),
        status: 'info',
        explain: 'Fat stored around your abdominal organs. Scales report this as a rating rather than a unit.',
        source: 'From your measurement',
        state: 'ok',
      }
    : {
        key: 'visceralFat',
        label: 'Visceral Fat Level',
        value: null,
        status: 'info',
        explain: 'Fat stored around your abdominal organs.',
        source: 'Needs a body-composition (bioimpedance) scale — it cannot be estimated from height and weight.',
        state: 'unavailable',
      });

  if (measured.bodyWaterPct != null) {
    rows.push({
      key: 'bodyWater',
      label: 'Total Body Water',
      value: `${round1((measured.bodyWaterPct / 100) * weightKg)} L`,
      status: sex ? classifyWater(measured.bodyWaterPct, sex) : 'info',
      explain: `Water content of your body — ${round1(measured.bodyWaterPct)}% of your mass.`,
      source: 'From your measurement',
      state: 'ok',
    });
  } else if (canEstimate) {
    const tbw = totalBodyWaterL(weightKg, heightCm, age!, sex!);
    const pct = (tbw / weightKg) * 100;
    rows.push({
      key: 'bodyWater',
      label: 'Total Body Water',
      value: `${round1(tbw)} L`,
      status: classifyWater(pct, sex!),
      explain: `Estimated water content of your body — about ${Math.round(pct)}% of your mass.`,
      source: 'Estimated — Watson formula (1980)',
      state: 'ok',
    });
  } else {
    rows.push(needsProfile('bodyWater', 'Total Body Water', 'Estimated water content of your body.'));
  }

  rows.push(measured.boneMassKg != null
    ? {
        key: 'boneMass',
        label: 'Bone Mass',
        value: `${round1(measured.boneMassKg)} kg`,
        status: 'info',
        explain: 'Mineral content and mass of your skeleton.',
        source: 'From your measurement',
        state: 'ok',
      }
    : {
        key: 'boneMass',
        label: 'Bone Mass',
        value: null,
        status: 'info',
        explain: 'Mineral content and mass of your skeleton.',
        source: 'Needs a body-composition scale or DEXA scan — there is no validated way to estimate it from height and weight.',
        state: 'unavailable',
      });

  return rows;
}

// ── Health tips keyed to BMI category ────────────────────────────────────────
export const HEALTH_TIPS: Record<string, { title: string; tips: string[] }> = {
  underweight: {
    title: 'Building toward a healthy weight',
    tips: [
      'Eat nutrient-dense foods rather than empty calories',
      'Increase protein intake across the day',
      'Add strength training to build lean mass',
      'Eat more frequently with calorie-rich snacks',
    ],
  },
  normal: {
    title: 'Maintaining your healthy weight',
    tips: [
      'Keep up your current eating and activity habits',
      'Exercise regularly — aim for 150 minutes a week',
      'Stay hydrated throughout the day',
      'Protect your sleep; it regulates appetite',
    ],
  },
  overweight: {
    title: 'Moving toward a healthier range',
    tips: [
      'Increase daily physical activity gradually',
      'Reduce ultra-processed and sugary foods',
      'Improve sleep quality and consistency',
      'Watch portion sizes rather than cutting food groups',
    ],
  },
  obese: {
    title: 'A structured approach helps most',
    tips: [
      'Follow a structured, sustainable nutrition plan',
      'Exercise consistently, starting at a comfortable level',
      'Seek guidance from a doctor or dietitian',
      'Track progress in small, achievable milestones',
    ],
  },
  severely_obese: {
    title: 'Professional support is recommended',
    tips: [
      'Speak with a healthcare professional about a plan',
      'Focus on sustainable changes over rapid loss',
      'Consider supervised nutrition and activity programmes',
      'Monitor related health markers with your doctor',
    ],
  },
};

/** One-line message shown next to the BMI result. */
export const BMI_MESSAGE: Record<string, string> = {
  underweight:    'You are below the healthy weight range.',
  normal:         'Great! You have a healthy body weight.',
  overweight:     "You're slightly above the healthy range.",
  obese:          'Consider improving your lifestyle and consult a healthcare professional.',
  severely_obese: 'Please consult a healthcare professional about a plan that suits you.',
};

// ── Unit conversion helpers (log screen toggles) ─────────────────────────────
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLbs = (kg: number) => kg / KG_PER_LB;
export const lbsToKg = (lbs: number) => lbs * KG_PER_LB;
/** cm → { feet, inches } with inches rounded to the nearest whole inch. */
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}
export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * CM_PER_IN;
