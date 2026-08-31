import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator }     from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator }   from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Real screens
import { TrackersHomeScreen }    from '../modules/trackers/screens/TrackersHomeScreen';
import { MoodTrackerScreen }     from '../modules/trackers/screens/MoodTrackerScreen';
import {
  SleepTrackerScreen,
  HabitTrackerScreen,
  PeriodTrackerScreen,
} from '../modules/trackers/screens/TrackerScreensABC';
import {
  HealthTrackerScreen,
  ExpenseTrackerScreen,
  InsightsDashboardScreen,
  MilestonesScreen,
  ProgressScreen,
} from '../modules/trackers/screens/TrackerScreensDEF';
import { AddHabitScreen }      from '../modules/trackers/screens/AddHabitScreen';
import { HabitHistoryScreen }  from '../modules/trackers/screens/HabitHistoryScreen';
import { AddTrackerScreen }    from '../modules/trackers/screens/AddTrackerScreen';
import { ExpenseHomeScreen }     from '../modules/trackers/screens/expense/ExpenseHomeScreen';
import { AddExpenseScreen }      from '../modules/trackers/screens/expense/AddExpenseScreen';
import { ExpenseHistoryScreen }  from '../modules/trackers/screens/expense/ExpenseHistoryScreen';
import { ExpenseReportsScreen }  from '../modules/trackers/screens/expense/ExpenseReportsScreen';
import { ExpenseCategoryScreen } from '../modules/trackers/screens/expense/ExpenseCategoryScreen';
import { AccountsScreen } from '../modules/trackers/screens/expense/AccountsScreen';
import { TransactionDetailScreen } from '../modules/trackers/screens/expense/TransactionDetailScreen';
import { BudgetsScreen } from '../modules/trackers/screens/expense/BudgetsScreen';
import { SetBudgetScreen } from '../modules/trackers/screens/expense/SetBudgetScreen';

// Water
import { WaterHomeScreen }    from '../modules/trackers/screens/water/WaterHomeScreen';
import { LogWaterScreen }     from '../modules/trackers/screens/water/LogWaterScreen';
import { WaterHistoryScreen } from '../modules/trackers/screens/water/WaterHistoryScreen';
import { WaterDayScreen } from '../modules/trackers/screens/water/WaterDayScreen';
import { WaterEntryDetailScreen } from '../modules/trackers/screens/water/WaterEntryDetailScreen';

// BMI
import { BMIHomeScreen }    from '../modules/trackers/screens/bmi/BMIHomeScreen';
import { BMILogScreen }     from '../modules/trackers/screens/bmi/BMILogScreen';
import { BMIRecordsScreen } from '../modules/trackers/screens/bmi/BMIRecordsScreen';
import { BMIRecordDetailScreen } from '../modules/trackers/screens/bmi/BMIRecordDetailScreen';
import { BMIProgressScreen } from '../modules/trackers/screens/bmi/BMIProgressScreen';
import { BMIGuideScreen } from '../modules/trackers/screens/bmi/BMIGuideScreen';

// Sleep (new dedicated screens)
import { SleepHomeScreen }    from '../modules/trackers/screens/sleep/SleepHomeScreen';
import { LogSleepScreen }     from '../modules/trackers/screens/sleep/LogSleepScreen';
import { SleepHistoryScreen } from '../modules/trackers/screens/sleep/SleepHistoryScreen';

// Period (new dedicated screens)
import { PeriodHomeScreen }     from '../modules/trackers/screens/period/PeriodHomeScreen';
import { LogPeriodScreen }      from '../modules/trackers/screens/period/LogPeriodScreen';
import { PeriodInsightsScreen } from '../modules/trackers/screens/period/PeriodInsightsScreen';
import { PeriodHistoryScreen }  from '../modules/trackers/screens/period/PeriodHistoryScreen';
import { PeriodDayDetailScreen } from '../modules/trackers/screens/period/PeriodDayDetailScreen';
import { CycleDetailsScreen }  from '../modules/trackers/screens/period/CycleDetailsScreen';
import { EditCycleScreen }     from '../modules/trackers/screens/period/EditCycleScreen';
import { SymptomDetailScreen } from '../modules/trackers/screens/period/SymptomDetailScreen';

// Mood (rich tracker)
import { MoodHomeScreen }     from '../modules/trackers/screens/mood/MoodHomeScreen';
import { LogMoodScreen }      from '../modules/trackers/screens/mood/LogMoodScreen';
import { MoodDetailScreen }   from '../modules/trackers/screens/mood/MoodDetailScreen';
import { MoodInsightsScreen } from '../modules/trackers/screens/mood/MoodInsightsScreen';
import { MoodJournalScreen }  from '../modules/trackers/screens/mood/MoodJournalScreen';

// Intimacy
import { IntimacyHomeScreen }     from '../modules/trackers/screens/intimacy/IntimacyHomeScreen';
import { LogIntimacyScreen }      from '../modules/trackers/screens/intimacy/LogIntimacyScreen';
import { IntimacyHistoryScreen }  from '../modules/trackers/screens/intimacy/IntimacyHistoryScreen';
import { IntimacyInsightsScreen } from '../modules/trackers/screens/intimacy/IntimacyInsightsScreen';
import { IntimacyEntryDetailScreen } from '../modules/trackers/screens/intimacy/IntimacyEntryDetailScreen';

// Sickness
import { SicknessHomeScreen }      from '../modules/trackers/screens/sickness/SicknessHomeScreen';
import { SicknessLogScreen }       from '../modules/trackers/screens/sickness/SicknessLogScreen';
import { MedicationTrackerScreen } from '../modules/trackers/screens/sickness/MedicationTrackerScreen';
import { SicknessInsightsScreen }  from '../modules/trackers/screens/sickness/SicknessInsightsScreen';
import { HealthHistoryScreen }     from '../modules/trackers/screens/sickness/HealthHistoryScreen';

// Measurement
import { MeasurementHomeScreen }    from '../modules/trackers/screens/measurement/MeasurementHomeScreen';
import { MeasurementLogScreen }     from '../modules/trackers/screens/measurement/MeasurementLogScreen';
import { MeasurementHistoryScreen } from '../modules/trackers/screens/measurement/MeasurementHistoryScreen';
import { MeasurementDetailScreen } from '../modules/trackers/screens/measurement/MeasurementDetailScreen';
import { MeasurementAnalyticsScreen } from '../modules/trackers/screens/measurement/MeasurementAnalyticsScreen';

import { SubscriptionGate }      from '../shared/components/SubscriptionGate';
import { Colors }                from '../shared/theme/colors';
import { FontFamily, FontSize }  from '../shared/theme/typography';

// AI Insights screen (stub — Phase 7)
const AIInsightsScreen = InsightsDashboardScreen as React.ComponentType<any>;

// ── Stacks ────────────────────────────────────────────────────────────────────
const HomeStack       = createNativeStackNavigator();
const InsightsStack   = createNativeStackNavigator();
const ProgressStack   = createNativeStackNavigator();
const MilestonesStack = createNativeStackNavigator();

function TrackersHomeStack() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="TrackersHome"   component={TrackersHomeScreen} />
      <HomeStack.Screen name="MoodTracker"    component={MoodTrackerScreen} />
      <HomeStack.Screen name="SleepTracker"   component={SleepTrackerScreen} />
      <HomeStack.Screen name="HabitTracker"   component={HabitTrackerScreen} />
      <HomeStack.Screen name="PeriodTracker"  component={PeriodTrackerScreen} />
      <HomeStack.Screen name="HealthTracker"  component={HealthTrackerScreen} />
      <HomeStack.Screen name="ExpenseTracker" component={ExpenseTrackerScreen} />
      <HomeStack.Screen name="AddHabit"       component={AddHabitScreen} />
      <HomeStack.Screen name="HabitHistory"   component={HabitHistoryScreen} />
      <HomeStack.Screen name="AddTracker"     component={AddTrackerScreen} />
      <HomeStack.Screen name="ExpenseHome"    component={ExpenseHomeScreen} />
      <HomeStack.Screen name="AddExpense"     component={AddExpenseScreen} />
      <HomeStack.Screen name="ExpenseHistory" component={ExpenseHistoryScreen} />
      <HomeStack.Screen name="ExpenseReports"  component={ExpenseReportsScreen} />
      <HomeStack.Screen name="ExpenseCategory"   component={ExpenseCategoryScreen} />
      <HomeStack.Screen name="Accounts"          component={AccountsScreen} />
      <HomeStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <HomeStack.Screen name="Budgets"           component={BudgetsScreen} />
      <HomeStack.Screen name="SetBudget"         component={SetBudgetScreen} />

      {/* Water */}
      <HomeStack.Screen name="WaterHome"    component={WaterHomeScreen} />
      <HomeStack.Screen name="LogWater"     component={LogWaterScreen} />
      <HomeStack.Screen name="WaterHistory"     component={WaterHistoryScreen} />
      <HomeStack.Screen name="WaterDay"         component={WaterDayScreen} />
      <HomeStack.Screen name="WaterEntryDetail" component={WaterEntryDetailScreen} />

      {/* BMI */}
      <HomeStack.Screen name="BMIHome"    component={BMIHomeScreen} />
      <HomeStack.Screen name="BMILog"     component={BMILogScreen} />
      <HomeStack.Screen name="BMIRecords"      component={BMIRecordsScreen} />
      <HomeStack.Screen name="BMIRecordDetail" component={BMIRecordDetailScreen} />
      <HomeStack.Screen name="BMIProgress"     component={BMIProgressScreen} />
      <HomeStack.Screen name="BMIGuide"        component={BMIGuideScreen} />

      {/* Sleep (dedicated) */}
      <HomeStack.Screen name="SleepHome"    component={SleepHomeScreen} />
      <HomeStack.Screen name="LogSleep"     component={LogSleepScreen} />
      <HomeStack.Screen name="SleepHistory" component={SleepHistoryScreen} />

      {/* Period (dedicated) */}
      <HomeStack.Screen name="PeriodHome"     component={PeriodHomeScreen} />
      <HomeStack.Screen name="LogPeriod"      component={LogPeriodScreen} />
      <HomeStack.Screen name="PeriodInsights" component={PeriodInsightsScreen} />
      <HomeStack.Screen name="PeriodHistory"   component={PeriodHistoryScreen} />
      <HomeStack.Screen name="PeriodDayDetail" component={PeriodDayDetailScreen} />
      <HomeStack.Screen name="CycleDetails"    component={CycleDetailsScreen} />
      <HomeStack.Screen name="EditCycle"       component={EditCycleScreen} />
      <HomeStack.Screen name="SymptomDetail"   component={SymptomDetailScreen} />

      {/* Mood (rich tracker) */}
      <HomeStack.Screen name="MoodHome"     component={MoodHomeScreen} />
      <HomeStack.Screen name="LogMood"      component={LogMoodScreen} />
      <HomeStack.Screen name="MoodDetail"   component={MoodDetailScreen} />
      <HomeStack.Screen name="MoodInsights" component={MoodInsightsScreen} />
      <HomeStack.Screen name="MoodJournal"  component={MoodJournalScreen} />

      {/* Intimacy */}
      <HomeStack.Screen name="IntimacyHome"     component={IntimacyHomeScreen} />
      <HomeStack.Screen name="LogIntimacy"      component={LogIntimacyScreen} />
      <HomeStack.Screen name="IntimacyHistory"  component={IntimacyHistoryScreen} />
      <HomeStack.Screen name="IntimacyInsights"    component={IntimacyInsightsScreen} />
      <HomeStack.Screen name="IntimacyEntryDetail" component={IntimacyEntryDetailScreen} />

      {/* Sickness */}
      <HomeStack.Screen name="SicknessHome"      component={SicknessHomeScreen} />
      <HomeStack.Screen name="SicknessLog"        component={SicknessLogScreen} />
      <HomeStack.Screen name="MedicationTracker"  component={MedicationTrackerScreen} />
      <HomeStack.Screen name="SicknessInsights"   component={SicknessInsightsScreen} />
      <HomeStack.Screen name="HealthHistory"      component={HealthHistoryScreen} />

      {/* Measurement */}
      <HomeStack.Screen name="MeasurementHome"    component={MeasurementHomeScreen} />
      <HomeStack.Screen name="MeasurementLog"     component={MeasurementLogScreen} />
      <HomeStack.Screen name="MeasurementHistory"   component={MeasurementHistoryScreen} />
      <HomeStack.Screen name="MeasurementDetail"    component={MeasurementDetailScreen} />
      <HomeStack.Screen name="MeasurementAnalytics" component={MeasurementAnalyticsScreen} />
    </HomeStack.Navigator>
  );
}

function TrackersInsightsStack() {
  return (
    <InsightsStack.Navigator screenOptions={{ headerShown: false }}>
      <InsightsStack.Screen name="InsightsDashboard" component={InsightsDashboardScreen} />
      <InsightsStack.Screen name="AIInsights"        component={AIInsightsScreen} />
    </InsightsStack.Navigator>
  );
}

function TrackersProgressStack() {
  return (
    <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgressStack.Screen name="Progress" component={ProgressScreen} />
    </ProgressStack.Navigator>
  );
}

function TrackersMilestonesStack() {
  return (
    <MilestonesStack.Navigator screenOptions={{ headerShown: false }}>
      <MilestonesStack.Screen name="Milestones" component={MilestonesScreen} />
    </MilestonesStack.Navigator>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS = [
  { name: 'TrackersHomeTab',  emoji: '🏠', label: 'Home'       },
  { name: 'InsightsTab',      emoji: '💡', label: 'Insights'   },
  { name: 'ProgressTab',      emoji: '📈', label: 'Progress'   },
  { name: 'MilestonesTab',    emoji: '🏆', label: 'Milestones' },
];

const Tab = createBottomTabNavigator();

function TrackersTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const tabBar = { ...s.tabBar, height: TAB_CONTENT_H + bottomPad, paddingBottom: bottomPad };

  // Goals uses the app's MAIN bottom bar (Me·Journal·Goals·Fits·Club), so this
  // navigator's own bar is hidden. Insights/Progress/Milestones are reached from
  // the buttons on the Goals home screen. (`tabBar` uses `tabBarStyle` values
  // above only when re-enabled.)
  void tabBar;
  return (
    <Tab.Navigator
      tabBar={() => null}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="TrackersHomeTab" component={TrackersHomeStack} />
      <Tab.Screen name="InsightsTab"     component={TrackersInsightsStack} />
      <Tab.Screen name="ProgressTab"     component={TrackersProgressStack} />
      <Tab.Screen name="MilestonesTab"   component={TrackersMilestonesStack} />
    </Tab.Navigator>
  );
}

export function TrackersNavigator() {
  // Goals is open (no paywall) for now. To gate it as premium later, wrap
  // <TrackersTabs /> back in <SubscriptionGate module="trackers"> … </>.
  return <TrackersTabs />;
}

const TAB_CONTENT_H = 58;

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor:  Colors.divider,
    borderTopWidth:  0.5,
    paddingTop:      8,
  },
  iconWrap:    { alignItems: 'center', gap: 2 },
  emoji:       { fontSize: 22 },
  emojiActive: { transform: [{ scale: 1.1 }] },
  label: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.xs,
    marginTop:  1,
  },
  labelActive: { fontFamily: FontFamily.bold },
});
