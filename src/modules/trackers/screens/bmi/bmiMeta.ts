import { BMICategory } from '../../types';

export const BMI_CATEGORY_META: Record<BMICategory, { label: string; color: string }> = {
  underweight:     { label: 'Underweight', color: '#42A5F5' },
  normal:          { label: 'Normal', color: '#43A047' },
  overweight:      { label: 'Overweight', color: '#FFA726' },
  obese:           { label: 'Obese', color: '#FF7043' },
  severely_obese:  { label: 'Severely Obese', color: '#E53935' },
};

export const BMI_SCALE: { max: number; color: string; label: string }[] = [
  { max: 18.5, color: '#42A5F5', label: '< 18.5' },
  { max: 25,   color: '#43A047', label: '18.5 – 24.9' },
  { max: 30,   color: '#FFA726', label: '25 – 29.9' },
  { max: 35,   color: '#FF7043', label: '30 – 34.9' },
  { max: 99,   color: '#E53935', label: '35+' },
];

export function bmiStatusMessage(category: BMICategory): string {
  switch (category) {
    case 'normal':         return "You're maintaining a healthy BMI! Keep up the great work.";
    case 'underweight':     return 'Your BMI is below the healthy range — consider talking to a nutritionist.';
    case 'overweight':      return 'Your BMI is slightly above the healthy range.';
    case 'obese':           return 'Your BMI is in the obese range — small consistent changes can help.';
    default:                return 'Your BMI is significantly above the healthy range — consider speaking with a doctor.';
  }
}
