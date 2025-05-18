import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

import CustomerHome from '../screens/customer/CustomerHome';
import CustomerTripHistory from '../screens/customer/CustomerTripHistory';
import CustomerProfile from '../screens/customer/CustomerProfile';
import CustomerEmergency from '../screens/customer/CustomerEmergency';
import SavedAddresses from '../screens/customer/SavedAddresses';
import EditProfile from '../screens/customer/EditProfile';
import CustomerMapScreen from '../screens/customer/CustomerMapScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen 
        name="CustomerHome"
        component={CustomerHome}
        options={{ 
          headerTitle: 'Trang chủ'
        }}
      />
      <HomeStack.Screen 
        name="CustomerMapScreen" 
        component={CustomerMapScreen}
        options={{ 
          headerTitle: 'Chọn điểm đến',
          presentation: 'modal'
        }}
      />
    </HomeStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen 
        name="CustomerProfile"
        component={CustomerProfile}
        options={{ 
          headerTitle: 'Hồ sơ'
        }}
      />
      <ProfileStack.Screen 
        name="SavedAddresses" 
        component={SavedAddresses}
        options={{ 
          headerTitle: 'Địa điểm đã lưu',
          presentation: 'card'
        }}
      />
      <ProfileStack.Screen 
        name="EditProfile" 
        component={EditProfile}
        options={{ 
          headerTitle: 'Chỉnh sửa thông tin',
          presentation: 'card'
        }}
      />
    </ProfileStack.Navigator>
  );
}

export default function CustomerNavigator() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    const checkEmailVerification = async () => {
      const isEmailProvider = user?.providerData?.[0]?.providerId === 'password';
      
      if (isEmailProvider && !user?.emailVerified) {
        await signOut();
        return;
      }
    };

    checkEmailVerification();
  }, [user, signOut]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'History':
              iconName = 'history';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            case 'Emergency':
              iconName = 'emergency';
              break;
            default:
              iconName = 'circle';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Trang chủ'
        }}
      />
      <Tab.Screen 
        name="History" 
        component={CustomerTripHistory}
        options={{ 
          headerTitle: 'Lịch sử',
          tabBarLabel: 'Lịch sử'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Hồ sơ'
        }}
      />
      <Tab.Screen 
        name="Emergency" 
        component={CustomerEmergency}
        options={{ 
          headerTitle: 'Liên hệ khẩn cấp',
          tabBarLabel: 'Khẩn cấp'
        }}
      />
    </Tab.Navigator>
  );
} 