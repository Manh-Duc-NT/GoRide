import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import WebView from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc, onSnapshot, getDoc, increment } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { BlurView } from 'expo-blur';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiaHVuZ3ZvIiwiYSI6ImNtMWx6M3RqMjA2NmUybHE3cW41Z2Vtb2QifQ.QSjh-vrcPNt2ukdTBmoIAw';

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

export default function DriverMapScreen({ navigation, route }) {
  const { user } = useAuth();
  const { currentRide } = route.params;
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rideStatus, setRideStatus] = useState(currentRide?.status || 'accepted');
  const [customer, setCustomer] = useState(null);
  const webViewRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  // Lắng nghe thay đổi vị trí
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Cần quyền truy cập vị trí để sử dụng tính năng này');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation(currentLocation);

      // Theo dõi vị trí
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          updateDriverLocation(newLocation);
          updateRideLocation(newLocation);
        }
      );
    })();

    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  // Lắng nghe thay đổi của ride
  useEffect(() => {
    if (!currentRide?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'rides', currentRide.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setRideStatus(data.status);

        // Cập nhật marker trên bản đồ
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            updateRideStatus('${data.status}');
          `);
        }
      }
    });

    return () => unsubscribe();
  }, [currentRide]);

  // Lấy thông tin khách hàng
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!currentRide?.customerId) return;

      try {
        const customerDoc = await getDoc(doc(db, 'users', currentRide.customerId));
        if (customerDoc.exists()) {
          setCustomer(customerDoc.data());
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
      }
    };

    fetchCustomer();
  }, [currentRide]);

  const updateDriverLocation = async (location) => {
    if (!user || !location?.coords) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading || 0,
          speed: location.coords.speed || 0,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  };

  const updateRideLocation = async (location) => {
    if (!currentRide?.id || !location?.coords) return;

    try {
      const rideRef = doc(db, 'rides', currentRide.id);
      await updateDoc(rideRef, {
        driverLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading || 0,
          speed: location.coords.speed || 0,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating ride location:', error);
    }
  };

  const handlePickupConfirm = async () => {
    if (!currentRide?.id) return;

    try {
      // Cập nhật trạng thái cuốc xe
      const rideRef = doc(db, 'rides', currentRide.id);
      await updateDoc(rideRef, {
        status: 'ongoing',
        startTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Cập nhật trạng thái tài xế
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'currentRide.status': 'ongoing',
        'currentRide.startTime': new Date().toISOString()
      });

      setRideStatus('ongoing');
    } catch (error) {
      console.error('Error confirming pickup:', error);
      Alert.alert('Lỗi', 'Không thể xác nhận đón khách. Vui lòng thử lại.');
    }
  };

  const handleCompleteRide = async () => {
    if (!currentRide?.id || !location?.coords) return;

    try {
      const endTime = new Date().toISOString();
      
      // Tính toán khoảng cách thực tế (đơn vị mét)
      const actualDistance = calculateDistance(
        currentRide.pickupLocation.latitude,
        currentRide.pickupLocation.longitude,
        location.coords.latitude,
        location.coords.longitude
      ) * 1000; // Chuyển km thành mét

      // Tính toán thời gian thực tế (đơn vị giây)
      const duration = calculateDuration(actualDistance / 1000) * 60; // Chuyển phút thành giây

      // Tính toán giá cuối cùng dựa trên khoảng cách thực tế
      const finalPrice = calculatePrice(actualDistance / 1000, currentRide.serviceType);

      // Cập nhật trạng thái cuốc xe
      const rideRef = doc(db, 'rides', currentRide.id);
      await updateDoc(rideRef, {
        status: 'completed',
        endTime,
        updatedAt: endTime,
        actualDistance,
        actualDuration: duration,
        finalPrice: finalPrice
      });

      // Cập nhật trạng thái tài xế
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentRide: null,
        isOnline: true,
        isAvailable: true,
        lastRideAt: endTime,
        updatedAt: endTime,
        'stats.totalRides': increment(1),
        'stats.totalEarnings': increment(finalPrice)
      });

      // Hiển thị thông báo hoàn thành với thông tin chi tiết
      Alert.alert(
        'Hoàn thành chuyến đi',
        `Khoảng cách: ${(actualDistance / 1000).toFixed(1)} km\nThời gian: ${Math.round(duration / 60)} phút\nTổng tiền: ${finalPrice.toLocaleString()}đ`,
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('DriverHome')
          }
        ]
      );
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Lỗi', 'Không thể hoàn thành chuyến đi. Vui lòng thử lại.');
    }
  };

  const handleCurrentLocation = () => {
    if (location?.coords && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.flyTo({
          center: [${location.coords.longitude}, ${location.coords.latitude}],
          zoom: 16,
          duration: 1000
        });
      `);
    }
  };

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
      <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; }
        #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        .driver-marker {
          width: 40px;
          height: 40px;
          background-color: #1a73e8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 2px solid white;
        }
        .pickup-marker {
          color: #4CAF50;
          font-size: 24px;
        }
        .dropoff-marker {
          color: #E53935;
          font-size: 24px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
        
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [${location?.coords.longitude || currentRide?.pickupLocation.longitude || 105.83991}, 
                  ${location?.coords.latitude || currentRide?.pickupLocation.latitude || 21.02800}],
          zoom: 15
        });

        // Add navigation control
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        let driverMarker = null;
        let pickupMarker = null;
        let dropoffMarker = null;

        function createCustomMarker(className) {
          const el = document.createElement('div');
          el.className = className;
          if (className === 'driver-marker') {
            el.innerHTML = '🚗';
          } else if (className === 'pickup-marker') {
            el.innerHTML = '🔵';
          } else if (className === 'dropoff-marker') {
            el.innerHTML = '📍';
          }
          return el;
        }

        // Initialize markers
        if (${location !== null}) {
          driverMarker = new mapboxgl.Marker({
            element: createCustomMarker('driver-marker'),
            anchor: 'center'
          })
          .setLngLat([${location?.coords.longitude || 0}, ${location?.coords.latitude || 0}])
          .addTo(map);
        }

        // Add pickup marker
        pickupMarker = new mapboxgl.Marker({
          element: createCustomMarker('pickup-marker'),
          anchor: 'bottom'
        })
        .setLngLat([${currentRide?.pickupLocation.longitude}, ${currentRide?.pickupLocation.latitude}])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Điểm đón</strong><br>${currentRide?.pickupLocation.address}'))
        .addTo(map);

        // Add dropoff marker
        dropoffMarker = new mapboxgl.Marker({
          element: createCustomMarker('dropoff-marker'),
          anchor: 'bottom'
        })
        .setLngLat([${currentRide?.dropoffLocation.longitude}, ${currentRide?.dropoffLocation.latitude}])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Điểm đến</strong><br>${currentRide?.dropoffLocation.address}'))
        .addTo(map);

        // Fit bounds to include all markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([${currentRide?.pickupLocation.longitude}, ${currentRide?.pickupLocation.latitude}]);
        bounds.extend([${currentRide?.dropoffLocation.longitude}, ${currentRide?.dropoffLocation.latitude}]);
        if (${location !== null}) {
          bounds.extend([${location?.coords.longitude || 0}, ${location?.coords.latitude || 0}]);
        }
        map.fitBounds(bounds, { padding: 100 });

        // Function to update driver location
        window.updateDriverLocation = function(longitude, latitude) {
          if (driverMarker) {
            driverMarker.setLngLat([longitude, latitude]);
          }
        };

        // Function to update ride status
        window.updateRideStatus = function(status) {
          // Update map based on status
          if (status === 'ongoing') {
            pickupMarker.remove();
          } else if (status === 'completed') {
            pickupMarker.remove();
            dropoffMarker.remove();
          }
        };

        // Notify that map is ready
        map.on('load', () => {
          window.ReactNativeWebView.postMessage('MAP_READY');
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <BlurView intensity={90} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.rideInfo}>
            <Text style={styles.rideStatus}>
              {rideStatus === 'accepted' ? 'Đang đến đón khách' :
               rideStatus === 'ongoing' ? 'Đang đến điểm đến' :
               'Hoàn thành'}
            </Text>
          </View>
        </View>
      </BlurView>

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : (
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={{ html: mapHTML }}
          javaScriptEnabled={true}
          onMessage={(event) => {
            if (event.nativeEvent.data === 'MAP_READY') {
              console.log('Map is ready');
            }
          }}
        />
      )}

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={handleCurrentLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#1a73e8" />
        </TouchableOpacity>

        {currentRide && (
          <View style={styles.rideCard}>
            <View style={styles.rideDetails}>
              <View style={styles.customerInfo}>
                <MaterialIcons name="person" size={24} color="#1a73e8" />
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>
                    {customer?.displayName || 'Khách hàng'}
                  </Text>
                  <Text style={styles.customerPhone}>
                    {customer?.phoneNumber || 'Không có số điện thoại'}
                  </Text>
                </View>
              </View>

              <View style={styles.locationInfo}>
                <MaterialIcons name="person-pin-circle" size={24} color="#4CAF50" />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Điểm đón</Text>
                  <Text style={styles.locationText}>
                    {currentRide.pickupLocation.address}
                  </Text>
                </View>
              </View>

              <View style={styles.locationInfo}>
                <MaterialIcons name="place" size={24} color="#E53935" />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Điểm đến</Text>
                  <Text style={styles.locationText}>
                    {currentRide.dropoffLocation.address}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.rideFooter}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Giá cước</Text>
                <Text style={styles.priceAmount}>
                  {currentRide.price.toLocaleString()}đ
                </Text>
              </View>
              
              {rideStatus === 'accepted' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handlePickupConfirm}
                >
                  <Text style={styles.actionButtonText}>
                    Xác nhận đón khách
                  </Text>
                </TouchableOpacity>
              )}

              {rideStatus === 'ongoing' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleCompleteRide}
                >
                  <Text style={styles.actionButtonText}>
                    Hoàn thành
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rideInfo: {
    flex: 1,
    marginLeft: 15,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rideStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a73e8',
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  currentLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 200,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  rideDetails: {
    marginBottom: 20,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  customerDetails: {
    marginLeft: 15,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  actionButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginLeft: 15,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    padding: 20,
    color: 'red',
    textAlign: 'center',
  },
}); 