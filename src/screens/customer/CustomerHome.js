import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, SafeAreaView } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

const { width } = Dimensions.get('window');

const services = [
  {
    id: 1,
    name: 'Xe máy',
    icon: 'motorcycle',
    iconType: 'FontAwesome5',
    description: 'Nhanh chóng & Tiết kiệm',
    color: '#1a73e8',
  },
  {
    id: 2,
    name: 'Ô tô 4 chỗ',
    icon: 'car',
    iconType: 'FontAwesome5',
    description: 'Thoải mái & An toàn',
    color: '#34a853',
  },
  {
    id: 3,
    name: 'Ô tô 7 chỗ',
    icon: 'car-side',
    iconType: 'FontAwesome5',
    description: 'Rộng rãi & Tiện nghi',
    color: '#4285f4',
  },
];

const CustomerHome = ({ navigation }) => {
  const { user } = useAuth();
  const firstName = user?.email?.split('@')[0] || 'Khách';
  const [nearbyDrivers, setNearbyDrivers] = useState({});

  useEffect(() => {
    const unsubscribes = services.map(service => {
      const driversQuery = query(
        collection(db, 'users'),
        where('role', '==', 'driver'),
        where('isOnline', '==', true),
        where('verificationStatus', '==', 'approved'),
        where('vehicle.type', '==', service.id)
      );

      return onSnapshot(driversQuery, (snapshot) => {
        const drivers = [];
        snapshot.forEach((doc) => {
          const driverData = doc.data();
          if (driverData.location) {
            drivers.push({
              id: doc.id,
              ...driverData
            });
          }
        });
        console.log(`Found ${drivers.length} drivers for service ${service.id}`);
        setNearbyDrivers(prev => ({
          ...prev,
          [service.id]: drivers
        }));
      });
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const quickLocations = [
    {
      id: 1,
      name: 'Về nhà',
      icon: 'home',
      address: user?.homeAddress || 'Thêm địa chỉ nhà',
      onPress: () => {
        if (user?.homeAddress && user?.homeLocation) {
          navigation.navigate('CustomerMapScreen', {
            destination: {
              address: user.homeAddress,
              location: user.homeLocation
            }
          });
        } else {
          navigation.navigate('Profile', { screen: 'SavedAddresses' });
        }
      }
    },
    {
      id: 2,
      name: 'Đến công ty',
      icon: 'business',
      address: user?.workAddress || 'Thêm địa chỉ công ty',
      onPress: () => {
        if (user?.workAddress && user?.workLocation) {
          navigation.navigate('CustomerMapScreen', {
            destination: {
              address: user.workAddress,
              location: user.workLocation
            }
          });
        } else {
          navigation.navigate('Profile', { screen: 'SavedAddresses' });
        }
      }
    },
  ];

  const handleServicePress = (serviceId) => {
    const selectedService = services.find(service => service.id === serviceId);
    const availableDrivers = nearbyDrivers[serviceId] || [];
    
    navigation.navigate('CustomerMapScreen', {
      serviceId,
      serviceName: selectedService.name,
      serviceIcon: selectedService.icon,
      serviceIconType: selectedService.iconType,
      serviceColor: selectedService.color,
      drivers: availableDrivers
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#1a73e8', '#0d47a1']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <View style={styles.walletContainer}>
            <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
            <Text style={styles.walletBalance}>500.000đ</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.quickLocations}>
            {quickLocations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={styles.quickLocationItem}
                onPress={location.onPress}
              >
                <View style={[
                  styles.locationIcon,
                  !user?.[location.id === 1 ? 'homeAddress' : 'workAddress'] && styles.locationIconEmpty
                ]}>
                  <Ionicons 
                    name={location.icon} 
                    size={24} 
                    color={user?.[location.id === 1 ? 'homeAddress' : 'workAddress'] ? '#fff' : '#1a73e8'} 
                  />
                </View>
                <View style={styles.quickLocationText}>
                  <Text style={styles.quickLocationTitle}>{location.name}</Text>
                  <Text 
                    style={[
                      styles.quickLocationAddress,
                      !user?.[location.id === 1 ? 'homeAddress' : 'workAddress'] && styles.quickLocationAddressEmpty
                    ]}
                    numberOfLines={1}
                  >
                    {location.address}
                  </Text>
                </View>
                <MaterialIcons 
                  name={user?.[location.id === 1 ? 'homeAddress' : 'workAddress'] ? 'directions' : 'add'} 
                  size={24} 
                  color={user?.[location.id === 1 ? 'homeAddress' : 'workAddress'] ? '#1a73e8' : '#666'} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.servicesContainer}>
            <Text style={styles.sectionTitle}>Dịch vụ</Text>
            <View style={styles.servicesGrid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceItem}
                  onPress={() => handleServicePress(service.id)}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                    {service.iconType === 'FontAwesome5' ? (
                      <FontAwesome5 name={service.icon} size={24} color="#fff" />
                    ) : (
                      <MaterialIcons name={service.icon} size={24} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                  <View style={styles.driversInfo}>
                    <MaterialIcons name="person" size={16} color="#666" />
                    <Text style={styles.driversCount}>
                      {(nearbyDrivers[service.id] || []).length} tài xế gần bạn
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.promotionsContainer}>
            <Text style={styles.sectionTitle}>Ưu đãi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={styles.promotionCard}>
                <LinearGradient
                  colors={['#ff4b1f', '#ff9068']}
                  style={styles.promotionGradient}
                >
                  <Text style={styles.promotionTitle}>Giảm 50%</Text>
                  <Text style={styles.promotionDescription}>Cho chuyến đi đầu tiên</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.promotionCard}>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.promotionGradient}
                >
                  <Text style={styles.promotionTitle}>Giảm 30K</Text>
                  <Text style={styles.promotionDescription}>Cho chuyến đi nội thành</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a73e8',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
  },
  walletBalance: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  quickLocations: {
    backgroundColor: '#fff',
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconEmpty: {
    backgroundColor: '#f0f4f8',
  },
  quickLocationText: {
    flex: 1,
    marginLeft: 15,
  },
  quickLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quickLocationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  quickLocationAddressEmpty: {
    color: '#1a73e8',
  },
  servicesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
  },
  promotionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  promotionCard: {
    width: width * 0.7,
    height: 120,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  promotionGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  promotionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  promotionDescription: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  driversInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f5f5f5',
    padding: 5,
    borderRadius: 10,
  },
  driversCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default CustomerHome; 