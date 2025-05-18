import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Image, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc, onSnapshot, collection, query, where, getDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as Location from 'expo-location';
import axios from 'axios';

const GOONG_API_KEY = 'LTvoiyw3BLpFYjlrkA7i0HuAUmRhyjmf5ZutLW0V'; 
const LOCATION_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 phút

const PRICE_PER_KM = {
  1: 10000, // Xe máy: 10,000đ/km
  2: 15000, // Ô tô 4 chỗ: 15,000đ/km
  3: 20000  // Ô tô 7 chỗ: 20,000đ/km
};

const BASE_PRICE = {
  1: 15000, // Xe máy: 15,000đ
  2: 25000, // Ô tô 4 chỗ: 25,000đ
  3: 30000  // Ô tô 7 chỗ: 30,000đ
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

const calculatePrice = (distance, serviceType) => {
  if (!distance || !serviceType) return 0;
  const basePrice = BASE_PRICE[serviceType] || 0;
  const pricePerKm = PRICE_PER_KM[serviceType] || 0;
  return Math.round(basePrice + (distance * pricePerKm));
};

const calculateDuration = (distance) => {
  if (!distance) return 0;
  // Giả sử tốc độ trung bình là 25 km/h
  const averageSpeed = 25;
  return Math.round((distance / averageSpeed) * 60); // Thời gian tính bằng phút
};

const loadEarnings = async () => {
  if (!user) return;

  try {
    const ridesRef = collection(db, 'rides');
    
    // Tính toán thời gian
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    console.log('Time ranges:', {
      startOfToday: startOfToday.toISOString(),
      startOfWeek: startOfWeek.toISOString(),
      startOfMonth: startOfMonth.toISOString(),
    });

    const q = query(
      ridesRef,
      where('driverId', '==', user.uid),
      where('status', '==', 'completed')
    );

    const querySnapshot = await getDocs(q);
    let todayEarnings = 0;
    let weekEarnings = 0;
    let monthEarnings = 0;

    querySnapshot.forEach((doc) => {
      const ride = doc.data();
      const endTimeDate = new Date(ride.endTime);
      const price = ride.price || 0;

      console.log('Processing ride:', {
        rideId: doc.id,
        endTime: ride.endTime,
        endTimeDate: endTimeDate.toISOString(),
        price,
        isToday: endTimeDate >= startOfToday,
        isThisWeek: endTimeDate >= startOfWeek,
        isThisMonth: endTimeDate >= startOfMonth
      });

      if (endTimeDate >= startOfToday) {
        todayEarnings += price;
        console.log('Added to today:', price, 'Total:', todayEarnings);
      }
      if (endTimeDate >= startOfWeek) {
        weekEarnings += price;
      }
      if (endTimeDate >= startOfMonth) {
        monthEarnings += price;
      }
    });

    console.log('Final earnings:', {
      today: todayEarnings,
      week: weekEarnings,
      month: monthEarnings
    });

    setEarnings({
      today: todayEarnings,
      week: weekEarnings,
      month: monthEarnings
    });
  } catch (error) {
    console.error('Error loading earnings:', error);
  }
};

export default function DriverHome({ navigation }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0
  });
  const [currentRide, setCurrentRide] = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const locationIntervalRef = useRef(null);
  const isAttemptingToStartLocationRef = useRef(false);

  // Lắng nghe thông tin tài xế
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshotDoc) => {
      if (snapshotDoc.exists()) {
        const data = snapshotDoc.data();
        setDriverData(data);
        setIsOnline(data.isOnline || false);
        setCurrentRide(data.currentRide || null);

        if (data.isOnline && locationIntervalRef.current === null && !isAttemptingToStartLocationRef.current) {
          startLocationUpdates();
        } else if (!data.isOnline && locationIntervalRef.current !== null) {
          stopLocationUpdates();
        }
      }
    });

    // Load earnings data
    loadEarnings();

    return () => {
      unsubscribe();
      stopLocationUpdates();
    };
  }, [user]);

  // Lắng nghe cuốc xe có sẵn
  useEffect(() => {
    if (!user || !driverData || !isOnline || !driverData.vehicle?.type) return;

    const ridesQuery = query(
      collection(db, 'rides'),
      where('status', '==', 'pending'),
      where('serviceType', '==', driverData.vehicle.type)
    );

    const unsubscribe = onSnapshot(ridesQuery, async (snapshot) => {
      try {
        const rides = [];
        for (const doc of snapshot.docs) {
          const rideData = doc.data();
          
          // Chỉ lấy các cuốc xe chưa có tài xế
          if (!rideData.driverId && driverData.location) {
            // Tính toán khoảng cách và giá ước tính
            const distance = calculateDistance(
              driverData.location.latitude,
              driverData.location.longitude,
              rideData.pickupLocation.latitude,
              rideData.pickupLocation.longitude
            );
            
            const estimatedPrice = calculatePrice(distance, rideData.serviceType);
            const estimatedDuration = calculateDuration(distance);

            rides.push({
              id: doc.id,
              ...rideData,
              customer: {
                name: rideData.customerName || 'Khách hàng',
                phone: rideData.customerPhone || ''
              },
              estimatedDistance: distance,
              estimatedDuration: estimatedDuration,
              estimatedPrice: estimatedPrice
            });
          }
        }
        setAvailableRides(rides);
      } catch (error) {
        console.error('Error processing rides:', error);
      }
    });

    return () => unsubscribe();
  }, [user, driverData, isOnline]);

  const updateDriverLocation = async (location) => {
    if (!user || !location || !location.coords) return;

    try {
      const { latitude, longitude, heading, speed } = location.coords;
      
      // Kiểm tra latitude và longitude
      if (latitude === undefined || longitude === undefined) {
        console.warn('Location coordinates are undefined');
        return;
      }
      
      // Đảm bảo heading và speed có giá trị mặc định nếu null hoặc undefined
      const safeHeading = heading !== null && heading !== undefined ? heading : 0;
      const safeSpeed = speed !== null && speed !== undefined ? speed : 0;

      // Lấy địa chỉ từ tọa độ sử dụng Goong API
      let address = '';
      try {
        const response = await axios.get(
          `https://rsapi.goong.io/Geocode?latlng=${latitude},${longitude}&api_key=${GOONG_API_KEY}`
        );
        if (response.data.results && response.data.results.length > 0) {
          address = response.data.results[0].formatted_address;
        }
      } catch (error) {
        console.error('Error getting address:', error);
      }
      
      // Cập nhật vị trí vào Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        location: {
          latitude,
          longitude,
          heading: safeHeading,
          speed: safeSpeed,
          address,
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });
      
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const startLocationUpdates = async () => {
    if (locationIntervalRef.current !== null || isAttemptingToStartLocationRef.current) {
      return;
    }

    isAttemptingToStartLocationRef.current = true;
    console.log("Starting location updates interval (every 2 minutes).");
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập vị trí để hoạt động.');
        if(user) {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { isOnline: false }, { merge: true });
        }
        return;
      }
      
      const fetchAndUpdateLocation = async () => {
          console.log('Fetching current location...');
          try {
              const currentLocation = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.High
              });
              
              if (!currentLocation) {
                  console.warn("getCurrentPositionAsync returned null");
                  return;
              }
              if (!currentLocation.coords) {
                  console.warn("getCurrentPositionAsync returned location without coords property");
                  return;
              }
              if (typeof currentLocation.coords.latitude !== 'number' || 
                  typeof currentLocation.coords.longitude !== 'number') {
                  console.warn("Location has invalid coordinates:", currentLocation.coords);
                  return;
              }
              
              await updateDriverLocation(currentLocation);
          } catch (locationError) {
              console.error('Error getting current location:', locationError);
          }
      };

      await fetchAndUpdateLocation();
      
      locationIntervalRef.current = setInterval(fetchAndUpdateLocation, LOCATION_UPDATE_INTERVAL);

    } catch (error) {
      console.error('Error starting location updates:', error);
      if(user) {
        Alert.alert('Lỗi vị trí', 'Không thể khởi động cập nhật vị trí. Vui lòng thử lại sau khi bật online lại.');
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { isOnline: false }, { merge: true });
      }
    } finally {
      isAttemptingToStartLocationRef.current = false;
    }
  };

  const stopLocationUpdates = () => {
      if (locationIntervalRef.current !== null) {
          console.log("Stopping location updates interval.");
          clearInterval(locationIntervalRef.current);
          locationIntervalRef.current = null;
      }
  };

  const toggleOnlineStatus = async () => {
    if (!user) return;

    const newStatus = !isOnline;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        isOnline: newStatus,
        lastStatusUpdate: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const handleStartRide = () => {
    navigation.navigate('DriverMapScreen', { currentRide });
  };

  const handleAcceptRide = async (ride) => {
    if (!user || !driverData) {
      Alert.alert('Lỗi', 'Không thể lấy thông tin tài xế. Vui lòng thử lại.');
      return;
    }

    // Kiểm tra thông tin tài xế
    if (!driverData.displayName || !driverData.licenseNumber) {
      Alert.alert('Lỗi', 'Vui lòng cập nhật thông tin cá nhân trước khi nhận cuốc.');
      return;
    }

    try {
      // Kiểm tra lại trạng thái cuốc xe trước khi nhận
      const rideRef = doc(db, 'rides', ride.id);
      const rideSnap = await getDoc(rideRef);
      
      if (!rideSnap.exists()) {
        Alert.alert('Lỗi', 'Cuốc xe không còn tồn tại.');
        return;
      }

      const rideData = rideSnap.data();
      if (rideData.status !== 'pending') {
        Alert.alert('Thông báo', 'Cuốc xe đã được tài xế khác nhận.');
        return;
      }

      // Cập nhật trạng thái cuốc xe
      const updateData = {
        status: 'accepted',
        driverId: user.uid,
        driverName: driverData.displayName,
        driverPhone: driverData.phoneNumber,
        driverLicenseNumber: driverData.licenseNumber,
        driverLocation: {
          latitude: driverData.location?.latitude || 0,
          longitude: driverData.location?.longitude || 0,
          address: driverData.location?.address || '',
        },
        vehicle: {
          type: driverData.vehicle?.type || 1,
          name: driverData.vehicle?.name || 'Xe máy',
          icon: driverData.vehicle?.icon || 'motorcycle',
          iconType: driverData.vehicle?.iconType || 'FontAwesome5',
        },
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(rideRef, updateData, { merge: true });

      // Cập nhật trạng thái tài xế
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        currentRide: {
          id: ride.id,
          customerId: ride.customerId,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
          price: ride.price,
          distance: ride.distance,
          duration: ride.duration,
          status: 'accepted',
          acceptedAt: updateData.acceptedAt
        },
        isAvailable: false,
        lastRideAt: updateData.acceptedAt
      }, { merge: true });

      // Chuyển đến màn hình bản đồ
      navigation.navigate('DriverMapScreen', { 
        currentRide: {
          ...ride,
          ...updateData
        }
      });
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Lỗi', 'Không thể nhận cuốc xe. Vui lòng thử lại.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#1a73e8', '#0d47a1']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileSection}>
              <View style={styles.profileInfo}>
                <Text style={styles.greeting}>Xin chào,</Text>
                <Text style={styles.driverName}>{user?.displayName || 'Tài xế'}</Text>
                <Text style={styles.driverEmail}>{driverData?.email}</Text>
                {driverData?.location && (
                  <View style={styles.locationContainer}>
                    <View style={styles.locationHeader}>
                      <MaterialIcons name="location-on" size={20} color="#fff" />
                      <Text style={styles.locationTitle}>Vị trí hiện tại</Text>
                    </View>
                    <View style={styles.locationDetails}>
                      <View style={styles.locationRow}>
                        <Text style={styles.locationLabel}>Vĩ độ:</Text>
                        <Text style={styles.locationValue}>
                          {driverData.location.latitude?.toFixed(6) || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.locationRow}>
                        <Text style={styles.locationLabel}>Kinh độ:</Text>
                        <Text style={styles.locationValue}>
                          {driverData.location.longitude?.toFixed(6) || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.locationRow}>
                        <Text style={styles.locationLabel}>Địa chỉ:</Text>
                        <Text style={styles.locationValue} numberOfLines={2}>
                          {driverData.location.address || 'Đang cập nhật...'}
                        </Text>
                      </View>
                      <View style={styles.locationRow}>
                        <Text style={styles.locationLabel}>Cập nhật:</Text>
                        <Text style={styles.locationValue}>
                          {formatDate(driverData.location.updatedAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.verificationBadge}>
                <MaterialIcons name="verified" size={20} color="#4CAF50" />
                <Text style={styles.verificationText}>Đã xác minh</Text>
              </View>
            </View>
            <View style={styles.onlineStatus}>
              <Text style={styles.statusText}>{isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</Text>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={isOnline ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Thông tin tài xế</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="update" size={20} color="#666" />
            <Text style={styles.infoLabel}>Ngày tạo:</Text>
            <Text style={styles.infoValue}>{formatDate(driverData?.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="update" size={20} color="#666" />
            <Text style={styles.infoLabel}>Cập nhật:</Text>
            <Text style={styles.infoValue}>{formatDate(driverData?.updatedAt)}</Text>
          </View>
        </View>

        <View style={styles.documentsCard}>
          <Text style={styles.documentsTitle}>Giấy tờ</Text>
          <View style={styles.documentRow}>
            <MaterialIcons name="badge" size={20} color="#666" />
            <Text style={styles.documentLabel}>CMND/CCCD</Text>
            {driverData?.documents?.idCard && (
              <Image 
                source={{ uri: driverData.documents.idCard }} 
                style={styles.documentThumbnail}
              />
            )}
          </View>
          <View style={styles.documentRow}>
            <MaterialIcons name="card-membership" size={20} color="#666" />
            <Text style={styles.documentLabel}>Bằng lái xe</Text>
            {driverData?.documents?.driverLicense && (
              <Image 
                source={{ uri: driverData.documents.driverLicense }} 
                style={styles.documentThumbnail}
              />
            )}
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Thu nhập</Text>
          <View style={styles.earningsGrid}>
            <View style={styles.earningsItem}>
              <View style={styles.earningsIconContainer}>
                <MaterialIcons name="today" size={24} color="#1a73e8" />
              </View>
              <Text style={styles.earningsAmount}>{earnings.today.toLocaleString()}đ</Text>
              <Text style={styles.earningsLabel}>Hôm nay</Text>
            </View>
            <View style={styles.earningsItem}>
              <View style={styles.earningsIconContainer}>
                <MaterialIcons name="date-range" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.earningsAmount}>{earnings.week.toLocaleString()}đ</Text>
              <Text style={styles.earningsLabel}>Tuần này</Text>
            </View>
            <View style={styles.earningsItem}>
              <View style={styles.earningsIconContainer}>
                <MaterialIcons name="event-note" size={24} color="#FF9800" />
              </View>
              <Text style={styles.earningsAmount}>{earnings.month.toLocaleString()}đ</Text>
              <Text style={styles.earningsLabel}>Tháng này</Text>
            </View>
          </View>
        </View>

        {currentRide && (
          <TouchableOpacity style={styles.currentRideCard} onPress={handleStartRide}>
            <View style={styles.rideHeader}>
              <MaterialIcons name="local-taxi" size={24} color="#1a73e8" />
              <Text style={styles.rideTitle}>Cuốc xe hiện tại</Text>
              <View style={[styles.rideStatusBadge, 
                currentRide.status === 'accepted' ? styles.statusAccepted :
                currentRide.status === 'ongoing' ? styles.statusOngoing :
                styles.statusCompleted
              ]}>
                <Text style={styles.rideStatusText}>
                  {currentRide.status === 'accepted' ? 'Đang đến điểm đón' :
                   currentRide.status === 'ongoing' ? 'Đang đến điểm đến' :
                   'Hoàn thành'}
                </Text>
              </View>
            </View>

            <View style={styles.customerSection}>
              <View style={styles.customerInfo}>
                <View style={styles.customerAvatar}>
                  {user?.photoURL ? (
                    <Image 
                      source={{ uri: user.photoURL }} 
                      style={styles.avatarImage} 
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.displayName ? 
                        user.displayName.charAt(0).toUpperCase() : 
                        user?.email?.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>
                    {user?.displayName || user?.email || 'Khách hàng'}
                  </Text>
                  <View style={styles.customerContact}>
                    <MaterialIcons name="phone" size={16} color="#666" />
                    <Text style={styles.customerContactText}>
                      {user?.phoneNumber || 'Chưa có số điện thoại'}
                    </Text>
                  </View>
                  <View style={styles.customerContact}>
                    <MaterialIcons name="email" size={16} color="#666" />
                    <Text style={styles.customerContactText}>
                      {user?.email || 'Chưa có email'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.locationSection}>
              <View style={styles.locationItem}>
                <View style={styles.locationIcon}>
                  <MaterialIcons name="my-location" size={20} color="#4CAF50" />
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationLabel}>Điểm đón</Text>
                  <Text style={styles.locationText} numberOfLines={2}>
                    {currentRide.pickupLocation?.address || 'Đang cập nhật...'}
                  </Text>
                  {currentRide.pickupLocation?.note && (
                    <Text style={styles.locationNote}>
                      Ghi chú: {currentRide.pickupLocation.note}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.locationDivider}>
                <View style={styles.dividerLine} />
                <MaterialIcons name="arrow-downward" size={20} color="#666" />
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.locationItem}>
                <View style={styles.locationIcon}>
                  <MaterialIcons name="place" size={20} color="#E53935" />
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationLabel}>Điểm đến</Text>
                  <Text style={styles.locationText} numberOfLines={2}>
                    {currentRide.dropoffLocation?.address || 'Đang cập nhật...'}
                  </Text>
                  {currentRide.dropoffLocation?.note && (
                    <Text style={styles.locationNote}>
                      Ghi chú: {currentRide.dropoffLocation.note}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.rideFooter}>
              <View style={styles.rideInfo}>
                <View style={styles.infoItem}>
                  <MaterialIcons name="straighten" size={16} color="#666" />
                  <Text style={styles.infoText}>{currentRide.distance} km</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialIcons name="timer" size={16} color="#666" />
                  <Text style={styles.infoText}>{currentRide.duration} phút</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialIcons name="attach-money" size={16} color="#666" />
                  <Text style={styles.infoText}>{currentRide.price?.toLocaleString()}đ</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.startRideButton} onPress={handleStartRide}>
                <MaterialIcons name="navigation" size={20} color="#fff" />
                <Text style={styles.startRideText}>Bắt đầu</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {isOnline && !currentRide && availableRides.length > 0 && (
          <View style={styles.availableRidesCard}>
            <Text style={styles.cardTitle}>Cuốc xe có sẵn</Text>
            {availableRides.map((ride) => (
              <View key={ride.id} style={styles.rideItem}>
                <View style={styles.rideHeader}>
                  <View style={styles.customerInfo}>
                    <View style={styles.customerAvatar}>
                      {ride.customerName ? (
                        <Text style={styles.avatarText}>
                          {ride.customerName.charAt(0).toUpperCase()}
                        </Text>
                      ) : (
                        <Text style={styles.avatarText}>K</Text>
                      )}
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>
                        {ride.customerName || 'Khách hàng'}
                      </Text>
                      <View style={styles.customerContact}>
                        <MaterialIcons name="phone" size={16} color="#666" />
                        <Text style={styles.customerContactText}>
                          {ride.customerPhone || 'Chưa có số điện thoại'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.rideStats}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="straighten" size={16} color="#666" />
                    <Text style={styles.statText}>
                      {(ride.distance / 1000).toFixed(1)} km
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="timer" size={16} color="#666" />
                    <Text style={styles.statText}>
                      {Math.round(ride.duration / 60)} phút
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="attach-money" size={16} color="#666" />
                    <Text style={styles.statText}>
                      {ride.price?.toLocaleString()}đ
                    </Text>
                  </View>
                </View>

                <View style={styles.rideLocations}>
                  <View style={styles.locationPoint}>
                    <MaterialIcons name="my-location" size={20} color="#1a73e8" />
                    <Text style={styles.locationText}>
                      {ride.pickupLocation.address}
                    </Text>
                  </View>
                  <View style={styles.locationDivider} />
                  <View style={styles.locationPoint}>
                    <MaterialIcons name="place" size={20} color="#1a73e8" />
                    <Text style={styles.locationText}>
                      {ride.dropoffLocation.address}
                    </Text>
                  </View>
                </View>

                <View style={styles.rideFooter}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRide(ride)}
                  >
                    <Text style={styles.acceptButtonText}>NHẬN CUỐC</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {isOnline && !currentRide && (
          <View style={styles.waitingCard}>
            <MaterialIcons name="search" size={48} color="#1a73e8" />
            <Text style={styles.waitingText}>Đang tìm cuốc xe...</Text>
            <Text style={styles.waitingSubtext}>Bạn sẽ nhận được thông báo khi có khách đặt xe</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a73e8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'column',
    gap: 20,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  driverEmail: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  locationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    width: '100%',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  locationDetails: {
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationLabel: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 12,
    width: 65,
  },
  locationValue: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  verificationText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  statusText: {
    color: '#fff',
    marginRight: 10,
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  documentsCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  documentLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  documentThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 5,
  },
  earningsCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  earningsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
  },
  currentRideCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  rideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  rideStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusAccepted: {
    backgroundColor: '#E3F2FD',
  },
  statusOngoing: {
    backgroundColor: '#E8F5E9',
  },
  statusCompleted: {
    backgroundColor: '#EFEBE9',
  },
  rideStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a73e8',
  },
  customerSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerContact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerContactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  locationSection: {
    marginBottom: 15,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  locationDivider: {
    width: 2,
    height: 20,
    backgroundColor: '#1a73e8',
    marginLeft: 9,
    marginVertical: 2,
  },
  dividerLine: {
    width: 2,
    height: 15,
    backgroundColor: '#ddd',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  rideInfo: {
    flexDirection: 'row',
    gap: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  startRideButton: {
    backgroundColor: '#1a73e8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  startRideText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  waitingCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  availableRidesCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  rideItem: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  rideStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  rideLocations: {
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  locationPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});