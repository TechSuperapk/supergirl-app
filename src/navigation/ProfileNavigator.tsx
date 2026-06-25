import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Profile screens (Phase 2)
import { ProfileScreen }          from '../modules/profile/screens/ProfileScreen';
import { EditProfileScreen }      from '../modules/profile/screens/EditProfileScreen';
import { NotificationsScreen }    from '../modules/profile/screens/NotificationsScreen';
import { PrivacySettingsScreen }  from '../modules/profile/screens/PrivacySettingsScreen';
import { SubscriptionScreen }     from '../modules/profile/screens/SubscriptionScreen';
import { HelpCenterScreen }       from '../modules/profile/screens/HelpCenterScreen';

// Boards screens (Phase 6)
import { BoardsHomeScreen }       from '../modules/boards/screens/BoardsHomeScreen';
import { BoardDetailScreen }      from '../modules/boards/screens/BoardDetailScreen';
import { CreateBoardScreen }      from '../modules/boards/screens/CreateBoardScreen';
import { BoardEditorScreen }      from '../modules/boards/screens/BoardEditorScreen';

// Subscription gate for Boards
import { SubscriptionGate }       from '../shared/components/SubscriptionGate';

// Backup / Restore (offline-first system)
import { BackupSettingsScreen }   from '../backup/screens/BackupSettingsScreen';
import { TrashScreen }            from '../backup/screens/TrashScreen';

import { ProfileStackParamList }  from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// Wrap boards in subscription gate
function BoardsHome(props: any) {
  return (
    <SubscriptionGate module="boards">
      <BoardsHomeScreen {...props} />
    </SubscriptionGate>
  );
}

// Backup/Trash screens use a plain onBack prop instead of navigation props.
function BackupSettings({ navigation }: any) {
  return <BackupSettingsScreen onBack={() => navigation.goBack()} />;
}
function Trash({ navigation }: any) {
  return <TrashScreen onBack={() => navigation.goBack()} />;
}

export function ProfileNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      initialRouteName="ProfileMain"
    >
      {/* ── Profile ── */}
      <Stack.Screen name="ProfileMain"     component={ProfileScreen} />
      <Stack.Screen name="EditProfile"     component={EditProfileScreen} />
      <Stack.Screen name="Notifications"   component={NotificationsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="Subscription"    component={SubscriptionScreen} />
      <Stack.Screen name="HelpCenter"      component={HelpCenterScreen} />
      <Stack.Screen name="BackupSettings"  component={BackupSettings} />
      <Stack.Screen name="Trash"           component={Trash} />

      {/* ── Boards ── */}
      <Stack.Screen name="BoardsHome"   component={BoardsHome} />
      <Stack.Screen name="BoardDetail"  component={BoardDetailScreen} />
      <Stack.Screen name="CreateBoard"  component={CreateBoardScreen} />
      <Stack.Screen
        name="BoardEditor"
        component={BoardEditorScreen}
        options={{
          animation:     'slide_from_bottom',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
