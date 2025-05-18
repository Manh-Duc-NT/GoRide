import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import DriverVerification from '../components/auth/DriverVerification';
import { USER_ROLES } from '../types/user';

// Import your role-specific navigators/screens
import CustomerNavigator from './CustomerNavigator';
import DriverNavigator from './DriverNavigator';
import VerificationPending from '../screens/driver/VerificationPending';

const Stack = createNativeStackNavigator();

// Auth Stack - Màn hình xác thực
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginForm} />
      <Stack.Screen name="Register" component={RegisterForm} />
      <Stack.Screen 
        name="DriverVerification" 
        component={DriverVerification}
        options={{
          headerShown: true,
          title: 'Xác thực tài xế',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen 
        name="VerificationPending" 
        component={VerificationPending}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();

  if (!user) {
    return <AuthStack />;
  }

  // Nếu là tài xế và chưa được xác thực hoặc đang chờ duyệt
  if (user.role === USER_ROLES.DRIVER && 
    (!user.verificationStatus || user.verificationStatus === 'rejected' || user.verificationStatus === 'pending')) {
    return <AuthStack />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user.role === USER_ROLES.CUSTOMER ? (
        <Stack.Screen name="CustomerTabs" component={CustomerNavigator} />
      ) : user.role === USER_ROLES.DRIVER && user.verificationStatus === 'approved' ? (
        <Stack.Screen name="DriverTabs" component={DriverNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginForm} />
      )}
    </Stack.Navigator>
  );
} 