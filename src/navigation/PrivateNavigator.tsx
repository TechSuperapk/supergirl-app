import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PrivateVaultScreen}      from '../modules/journaling/screens/PrivateVaultScreen';
import {SecurityQuestionScreen}  from '../modules/journaling/screens/SecurityQuestionScreen';
import {PrivateJournalScreen}    from '../modules/journaling/screens/PrivateJournalScreen';
import {ChangePINScreen}         from '../modules/journaling/screens/ChangePINScreen';
import {ForgotPINScreen}         from '../modules/journaling/screens/ForgotPINScreen';

export type PrivateStackParamList={
  PrivateVault:    undefined;
  SecurityVerify:  undefined;
  PrivateJournal:  undefined;
  ChangePIN:       undefined;
  ForgotPIN:       undefined;
};

const Stack=createNativeStackNavigator<PrivateStackParamList>();

export function PrivateNavigator() {
  return (
    <Stack.Navigator initialRouteName="PrivateVault" screenOptions={{headerShown:false}}>
      <Stack.Screen name="PrivateVault"   component={PrivateVaultScreen}/>
      <Stack.Screen name="SecurityVerify" component={SecurityQuestionScreen} options={{animation:'slide_from_right'}}/>
      <Stack.Screen name="PrivateJournal" component={PrivateJournalScreen}/>
      <Stack.Screen name="ChangePIN"      component={ChangePINScreen}      options={{animation:'slide_from_right'}}/>
      <Stack.Screen name="ForgotPIN"      component={ForgotPINScreen}      options={{animation:'slide_from_right'}}/>
    </Stack.Navigator>
  );
}
