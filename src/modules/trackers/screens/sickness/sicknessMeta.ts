/**
 * sicknessMeta — shared option lists & tag-color helpers for the Sickness
 * tracker screens (symptom picker, severity/status chip colors, medication
 * form option lists).
 */
import { SicknessSeverity, SicknessFeeling, MedicationFoodTiming, MedicationStatus } from '../../types';

export const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Fatigue', 'Sore throat', 'Runny nose', 'Cough',
  'Shortness of breath', 'Chest tightness', 'Nausea', 'Dizziness', 'Muscle aches',
  'Stomach ache', 'Back pain', 'Other',
];

export const FEELING_OPTIONS: { key: SicknessFeeling; label: string; emoji: string }[] = [
  { key: 'bad', label: 'Bad', emoji: '🤒' },
  { key: 'nauseous', label: 'Nauseous', emoji: '🤢' },
  { key: 'queasy', label: 'Queasy', emoji: '😵' },
  { key: 'good', label: 'Good', emoji: '🙂' },
];

export const SEVERITY_OPTIONS: { key: SicknessSeverity; label: string }[] = [
  { key: 'mild', label: 'Mild' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'severe', label: 'Severe' },
];

export function severityTag(severity: SicknessSeverity): { bg: string; text: string; label: string } {
  switch (severity) {
    case 'severe':   return { bg: '#FFCDD2', text: '#C62828', label: 'Severe' };
    case 'moderate': return { bg: '#EEEEEE', text: '#555555', label: 'Moderate' };
    default:         return { bg: '#C8E6C9', text: '#2E7D32', label: 'Mild' };
  }
}

export function statusTagColors(status: MedicationStatus): { bg: string; text: string } {
  switch (status) {
    case 'taken':   return { bg: '#C8E6C9', text: '#2E7D32' };
    case 'due':     return { bg: '#FFE0B2', text: '#EF6C00' };
    case 'skipped': return { bg: '#EEEEEE', text: '#555555' };
    default:        return { bg: '#FFCDD2', text: '#C62828' }; // missed
  }
}

export const FOOD_TIMING_OPTIONS: { key: MedicationFoodTiming; label: string }[] = [
  { key: 'before_food', label: 'Before Food' },
  { key: 'after_food', label: 'After Food' },
  { key: 'empty_stomach', label: 'Empty Stomach' },
];

export const FREQUENCY_OPTIONS = ['Once', 'Daily', 'Alternate days', 'Weekly', 'As needed'];

export const SIDE_EFFECT_OPTIONS = ['Nausea', 'Drowsiness', 'Dizziness', 'Headache', 'None', 'Others'];

export const MEDICATION_STATUS_OPTIONS: { key: MedicationStatus; label: string; emoji: string }[] = [
  { key: 'taken', label: 'Taken', emoji: '✅' },
  { key: 'skipped', label: 'Skipped', emoji: '⏭️' },
  { key: 'missed', label: 'Missed', emoji: '❌' },
];
