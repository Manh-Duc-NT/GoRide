import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import DriverHome from '../screens/driver/DriverHome';
import DriverTripHistory from '../screens/driver/DriverTripHistory';
import DriverProfile from '../screens/driver/DriverProfile';
import DriverMapScreen from '../screens/driver/DriverMapScreen';
import EditProfile from '../screens/driver/EditProfile';
import VehicleInfo from '../screens/driver/VehicleInfo';
import TripDetailScreen from '../screens/driver/TripDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeMain" 
        component={DriverHome}
        options={{ headerTitle: 'Trang chủ' }}
      />
      <Stack.Screen 
        name="DriverMapScreen" 
        component={DriverMapScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HistoryMain" 
        component={DriverTripHistory}
        options={{ headerTitle: 'Lịch sử chuyến đi' }}
      />
      <Stack.Screen 
        name="TripDetail" 
        component={TripDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={DriverProfile}
        options={{ headerTitle: 'Hồ sơ' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfile}
        options={{ headerTitle: 'Chỉnh sửa thông tin' }}
      />
      <Stack.Screen 
        name="VehicleInfo" 
        component={VehicleInfo}
        options={{ headerTitle: 'Thông tin phương tiện' }}
      />
    </Stack.Navigator>
  );
}

export default function DriverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
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
        component={HomeStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
} 