/**
 * BMIGuideScreen — static explainer: what BMI is, the formula, the categories,
 * healthy range, and importantly its limitations. Included because BMI is
 * routinely over-interpreted; the limitations section is not optional filler.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { BMI_SCALE, BMI_CATEGORY_META } from './bmiMeta';
import { BMICategory } from '../../types';

type Props = NativeStackScreenProps<any, 'BMIGuide'>;

const CATEGORY_ROWS: { key: BMICategory; range: string }[] = [
  { key: 'underweight',    range: 'Below 18.5' },
  { key: 'normal',         range: '18.5 – 24.9' },
  { key: 'overweight',     range: '25.0 – 29.9' },
  { key: 'obese',          range: '30.0 – 34.9' },
  { key: 'severely_obese', range: '35.0 and above' },
];

const LIMITATIONS = [
  'It cannot tell muscle from fat — muscular people often read as "overweight" despite low body fat.',
  'It ignores where fat is stored, yet abdominal fat carries more health risk than fat elsewhere.',
  'The same thresholds are applied to everyone, though healthy ranges differ across ethnic groups.',
  'It was designed to describe populations, not to diagnose individuals.',
  'It is not meaningful during pregnancy, or for children and adolescents without age-specific charts.',
];

const MAINTAIN_TIPS = [
  'Aim for 150 minutes of moderate activity a week, plus strength work twice a week.',
  'Build meals around vegetables, whole grains and protein.',
  'Keep sleep consistent — short sleep disrupts appetite hormones.',
  'Weigh yourself at the same time of day for comparable readings.',
  'Track trends over weeks, not day-to-day fluctuations.',
];

export function BMIGuideScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">BMI Guide</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <AppText variant="headingSmall" color={Colors.textPrimary}>What is BMI?</AppText>
          <AppText variant="body" color={Colors.textSecondary} style={s.para}>
            Body Mass Index is a single number that compares your weight to your height. It's used as a quick screening
            tool to place people into broad weight categories — not as a measure of health on its own.
          </AppText>
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>The formula</AppText>
        <View style={s.card}>
          <View style={s.formulaBox}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>BMI = weight (kg) ÷ height (m)²</AppText>
          </View>
          <AppText variant="caption" color={Colors.textMuted} style={{ marginTop: 8 }}>
            Example: 58 kg at 1.65 m → 58 ÷ (1.65 × 1.65) = 21.3
          </AppText>
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Categories</AppText>
        <View style={s.card}>
          <View style={s.scaleBar}>
            {BMI_SCALE.map(seg => <View key={seg.label} style={[s.scaleSeg, { backgroundColor: seg.color }]} />)}
          </View>
          <View style={{ marginTop: Spacing.base }}>
            {CATEGORY_ROWS.map((row, i) => {
              const meta = BMI_CATEGORY_META[row.key];
              return (
                <View key={row.key} style={[s.row, i === CATEGORY_ROWS.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[s.dot, { backgroundColor: meta.color }]} />
                  <AppText variant="body" color={Colors.textPrimary} style={{ flex: 1 }}>{meta.label}</AppText>
                  <AppText variant="label" color={Colors.textSecondary}>{row.range}</AppText>
                </View>
              );
            })}
          </View>
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Healthy weight range</AppText>
        <View style={s.card}>
          <AppText variant="body" color={Colors.textSecondary} style={{ lineHeight: 22 }}>
            A BMI between 18.5 and 24.9 is generally considered healthy. Because BMI depends on height, that band
            translates into a different weight range for each person — the app calculates yours from your logged height
            and shows it on the dashboard.
          </AppText>
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Limitations worth knowing</AppText>
        <View style={[s.card, { backgroundColor: '#FEF3C7' }]}>
          {LIMITATIONS.map(l => (
            <View key={l} style={s.bulletRow}>
              <AppText variant="caption" color="#92400E">•</AppText>
              <AppText variant="body" color="#78350F" style={{ flex: 1, lineHeight: 21 }}>{l}</AppText>
            </View>
          ))}
          <AppText variant="caption" color="#92400E" style={{ marginTop: Spacing.sm }}>
            Treat BMI as one signal among many, and talk to a healthcare professional before acting on it.
          </AppText>
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Tips for a healthy BMI</AppText>
        <View style={s.card}>
          {MAINTAIN_TIPS.map(t => (
            <View key={t} style={s.bulletRow}>
              <AppText variant="caption" color={Colors.textMuted}>•</AppText>
              <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1, lineHeight: 21 }}>{t}</AppText>
            </View>
          ))}
        </View>

        <AppText variant="caption" color={Colors.textLight} style={{ marginTop: Spacing.lg, lineHeight: 18 }}>
          This guide is general information, not medical advice. The body-composition figures elsewhere in this tracker
          are estimates from population formulas and are not a substitute for clinical measurement.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 40 },
  scroll: { padding: Spacing.base, paddingBottom: 60 },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm },
  para: { marginTop: 6, lineHeight: 22 },

  formulaBox: {
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    paddingVertical: Spacing.base, alignItems: 'center',
  },

  scaleBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  scaleSeg: { flex: 1, height: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bulletRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
