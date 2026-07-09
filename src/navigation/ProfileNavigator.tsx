import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Profile screens (Phase 2)
import { ProfileScreen }          from '../modules/profile/screens/ProfileScreen';
import { EditProfileScreen }      from '../modules/profile/screens/EditProfileScreen';
import { NotificationsScreen }    from '../modules/profile/screens/NotificationsScreen';
import { PrivacySettingsScreen }  from '../modules/profile/screens/PrivacySettingsScreen';
import { SubscriptionScreen }     from '../modules/profile/screens/SubscriptionScreen';
import { HelpCenterScreen }       from '../modules/profile/screens/HelpCenterScreen';

// Boards (Phase 6) isn't built out yet — development is focused on Journal
// first, so its entry point mounts the shared placeholder below instead of
// the real screens. Swap back to the commented imports/screens once Boards
// is ready to ship.
// import { BoardsHomeScreen }       from '../modules/boards/screens/BoardsHomeScreen';
// import { BoardDetailScreen }      from '../modules/boards/screens/BoardDetailScreen';
// import { CreateBoardScreen }      from '../modules/boards/screens/CreateBoardScreen';
// import { BoardEditorScreen }      from '../modules/boards/screens/BoardEditorScreen';
import { UnderDevelopmentScreen } from '../shared/components/UnderDevelopmentScreen';

// Backup / Restore (offline-first system)
import { BackupSettingsScreen }   from '../backup/screens/BackupSettingsScreen';
import { TrashScreen }            from '../backup/screens/TrashScreen';

import { ProfileStackParamList }  from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// Boards entry point — placeholder until the module is built out (see note above).
function BoardsHome() {
  return <UnderDevelopmentScreen module="boards" />;
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

      {/* Boards under development — only the placeholder entry point is mounted */}
      <Stack.Screen name="BoardsHome"   component={BoardsHome} />
    </Stack.Navigator>
  );
}
