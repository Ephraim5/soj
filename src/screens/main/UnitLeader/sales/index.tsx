import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SalesHome from './screens/SalesHome';
import ViewDetails from './screens/ViewDetails';
import RecordEmpty from './screens/RecordEmpty';
import { SalesStackParamList } from './types';

const Stack = createNativeStackNavigator<SalesStackParamList>();

export default function SalesNavigator() {
  return (
    <Stack.Navigator initialRouteName="SalesHome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SalesHome" component={SalesHome} />
      <Stack.Screen name="ViewDetails" component={ViewDetails} />
      <Stack.Screen name="RecordEmpty" component={RecordEmpty} />
      
     
    </Stack.Navigator>
  );
}
