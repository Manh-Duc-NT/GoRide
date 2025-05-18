import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Animated, Platform, Alert, Image } from 'react-native';
import * as Location from 'expo-location';
import WebView from 'react-native-webview';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc, collection, query, where, getDoc, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { BlurView } from 'expo-blur';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiaHVuZ3ZvIiwiYSI6ImNtMWx6M3RqMjA2NmUybHE3cW41Z2Vtb2QifQ.QSjh-vrcPNt2ukdTBmoIAw';

// Vị trí mặc định - Hà Nội (chỉ dùng khi không có vị trí nào khác)
const DEFAULT_LOCATION = {
  latitude: 21.0277633,
  longitude: 105.8341583,
  address: "Sàn Bất Động Ngoại Giao Đoàn, Cát Linh, Hà Nội"
};

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

export default function CustomerMapScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const { user } = useAuth();
  const webViewRef = useRef(null);
  const fetchIntervalRef = useRef(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [estimatedDuration, setEstimatedDuration] = useState(null);
  const [bookingStep, setBookingStep] = useState(0); // 0: chọn điểm, 1: xác nhận, 2: chờ tài xế, 3: đang đi
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Get service information and drivers from route params
  const serviceInfo = route.params?.serviceId ? {
    id: route.params.serviceId,
    name: route.params.serviceName,
    icon: route.params.serviceIcon,
    iconType: route.params.serviceIconType,
    color: route.params.serviceColor
  } : null;

  // Get destination from route params if coming from quick locations
  const destination = route.params?.destination;

  // Get initial drivers list from route params
  const initialDrivers = route.params?.drivers || [];

  const slideAnim = useState(new Animated.Value(0))[0];

  const GOONG_API_KEY = 'LTvoiyw3BLpFYjlrkA7i0HuAUmRhyjmf5ZutLW0V';
  // Lấy vị trí hiện tại của user từ Firestore
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.location) {
              setLocation(userData.location);
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching user location:', error);
        }
      }
      
      // Nếu không có vị trí trong Firestore, lấy vị trí từ thiết bị
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Cần cấp quyền truy cập vị trí để sử dụng tính năng này');
        setLocation(DEFAULT_LOCATION);
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        const newLocation = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          timestamp: new Date().toISOString()
        };
        setLocation(newLocation);
        if (user) {
          await updateUserLocation(newLocation);
        }
      } catch (error) {
        console.error('Error getting current location:', error);
        setLocation(DEFAULT_LOCATION);
      }
    };

    fetchUserLocation();
  }, [user]);

  // Theo dõi vị trí thay đổi
  useEffect(() => {
    let locationSubscription;

    const startLocationTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (newLocation) => {
          const locationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            timestamp: new Date().toISOString()
          };
          
          setLocation(locationData);
          
          if (user) {
            await updateUserLocation(locationData);
          }

          // Update map marker if map is ready
          if (mapReady && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              updateCurrentLocation(${locationData.longitude}, ${locationData.latitude});
            `);
          }
        }
      );
    };

    if (user) {
      startLocationTracking();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [user, mapReady]);

  useEffect(() => {
    if (destination) {
      setSelectedPlace({
        description: destination.address,
        location: destination.location
      });
      setSearchQuery(destination.address);
      setIsExpanded(true);
    }
  }, [destination]);

  // Fetch drivers function
  const fetchDrivers = useCallback(async () => {
    if (!serviceInfo || !mapReady) return;

    try {
      const driversQuery = query(
        collection(db, 'users'),
        where('isOnline', '==', true),
        where('role', '==', 'driver'),
        where('verificationStatus', '==', 'approved'),
        where('vehicle.type', '==', serviceInfo.id)
      );

      const snapshot = await getDocs(driversQuery);
      const driversData = [];
      snapshot.forEach((doc) => {
        const driver = doc.data();
        if (driver.location) {
          driversData.push({
            id: doc.id,
            ...driver
          });
        }
      });

      console.log(`Found ${driversData.length} drivers for service ${serviceInfo.id}`);
      setDrivers(driversData);
      
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          updateDriverMarkers(${JSON.stringify(driversData)});
        `);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  }, []); // Empty dependency array since we use refs and stable values

  // Set up fetch interval when component mounts
  useEffect(() => {
    if (!serviceInfo || !mapReady) return;

    // Clear any existing interval
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current);
    }

    // Initial fetch
    fetchDrivers();

    // Set up new interval
    fetchIntervalRef.current = setInterval(fetchDrivers, 120000); // 2 minutes

    // Cleanup function
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
    };
  }, [serviceInfo?.id, mapReady]); // Only re-run if serviceId or mapReady changes

  // Initialize map with initial drivers
  useEffect(() => {
    if (mapReady && webViewRef.current && initialDrivers.length > 0) {
      webViewRef.current.injectJavaScript(`
        updateDriverMarkers(${JSON.stringify(initialDrivers)});
      `);
    }
  }, [mapReady]);

  const updateUserLocation = async (locationData) => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          location: locationData
        }, { merge: true });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }
  };

  const searchPlaces = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSuggestions(data.predictions || []);
    } catch (error) {
      console.error('Error searching places:', error);
    }
  };

  const handlePlaceSelect = async (place) => {
    try {
      // Lấy tọa độ từ place_id
      const response = await fetch(
        `https://rsapi.goong.io/Place/Detail?place_id=${place.place_id}&api_key=${GOONG_API_KEY}`
      );
      const data = await response.json();
      
      if (data.result && data.result.geometry) {
        const selectedLocation = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          address: place.description
        };
        
        setSelectedLocation(selectedLocation);
        setSelectedPlace({
          description: place.description,
          location: selectedLocation
        });
        setSearchQuery(place.description);
        setSuggestions([]);
        setIsExpanded(true);
        
        // Tính toán ước tính ngay khi có vị trí
        if (location) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            selectedLocation.latitude,
            selectedLocation.longitude
          );
          const duration = calculateDuration(distance);
          const price = calculatePrice(distance, serviceInfo?.id);

          setEstimatedDistance(distance);
          setEstimatedDuration(duration);
          setEstimatedPrice(price);
        }

        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Cập nhật marker trên bản đồ
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (destinationMarker) {
              destinationMarker.setLngLat([${selectedLocation.longitude}, ${selectedLocation.latitude}]);
            } else {
              destinationMarker = new mapboxgl.Marker({
                element: createCustomMarker('destination-marker'),
                anchor: 'bottom'
              })
              .setLngLat([${selectedLocation.longitude}, ${selectedLocation.latitude}])
              .addTo(map);
            }
            
            // Fit bounds to include both markers
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([${selectedLocation.longitude}, ${selectedLocation.latitude}]);
            bounds.extend([${location?.longitude || DEFAULT_LOCATION.longitude}, 
                         ${location?.latitude || DEFAULT_LOCATION.latitude}]);
            map.fitBounds(bounds, { padding: 100 });
          `);
        }
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Lỗi', 'Không thể lấy thông tin địa điểm. Vui lòng thử lại.');
    }
  };

  const handleCurrentLocation = () => {
    if (location && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        zoomToCurrentLocation(${location.longitude}, ${location.latitude});
      `);
    }
  };

  const handleZoomIn = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.zoomIn({duration: 300});
      `);
    }
  };

  const handleZoomOut = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.zoomOut({duration: 300});
      `);
    }
  };

  // Trong phần lắng nghe chuyến đi hiện tại
  useEffect(() => {
    if (!user) return;

    const ridesQuery = query(
      collection(db, 'rides'),
      where('customerId', '==', user.uid),
      where('status', 'in', ['accepted', 'ongoing', 'completed', 'cancelled'])
    );

    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const rideData = snapshot.docs[0].data();
        const rideId = snapshot.docs[0].id;
        
        if (rideData.status === 'cancelled') {
          // Nếu chuyến đã hủy, đợi 3 giây rồi reset về trạng thái ban đầu
          setCurrentRide({
            id: rideId,
            ...rideData
          });
          setTimeout(() => {
            setCurrentRide(null);
            setBookingStep(0);
          }, 3000);
        } else if (rideData.status === 'completed') {
          // Nếu chuyến đã hoàn thành, chỉ hiển thị trạng thái và reset sau 3 giây
          setCurrentRide({
            id: rideId,
            ...rideData
          });
          setTimeout(() => {
            setCurrentRide(null);
            setBookingStep(0);
          }, 3000);
        } else {
          setCurrentRide({
            id: rideId,
            ...rideData
          });
          setBookingStep(3);
        }
      } else {
        setCurrentRide(null);
        setBookingStep(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

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

  // Thay đổi useEffect để chỉ tính toán khi có đủ thông tin
  useEffect(() => {
    if (!selectedPlace?.location || !location || !serviceInfo?.id) return;

    try {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        selectedPlace.location.latitude,
        selectedPlace.location.longitude
      );

      const duration = calculateDuration(distance);
      const price = calculatePrice(distance, serviceInfo.id);

      setEstimatedDistance(distance);
      setEstimatedDuration(duration);
      setEstimatedPrice(price);
    } catch (error) {
      console.error('Error calculating estimates:', error);
    }
  }, [selectedPlace, location, serviceInfo]);

  const handleBooking = async () => {
    if (!user || !selectedLocation || !location || !serviceInfo) {
      Alert.alert('Lỗi', 'Thiếu thông tin cần thiết để đặt xe.');
      return;
    }

    try {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        selectedLocation.latitude,
        selectedLocation.longitude
      );

      const duration = calculateDuration(distance);
      const price = calculatePrice(distance, serviceInfo.id);

      const rideData = {
        customerId: user.uid,
        customerName: user.displayName,
        customerPhone: user.phoneNumber,
        driverId: null,
        status: 'pending',
        pickupLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || 'Vị trí hiện tại'
        },
        dropoffLocation: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: selectedLocation.address
        },
        serviceType: serviceInfo.id,
        serviceName: serviceInfo.name,
        distance: distance,
        duration: duration,
        price: price,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const rideRef = await addDoc(collection(db, 'rides'), rideData);
      setCurrentRide({ id: rideRef.id, ...rideData });
      setBookingStep(2);
    } catch (error) {
      console.error('Error creating ride:', error);
      Alert.alert('Lỗi', 'Không thể tạo chuyến đi. Vui lòng thử lại.');
    }
  };

  const handleCancelRide = async () => {
    if (!currentRide) return;

    try {
      await setDoc(doc(db, 'rides', currentRide.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCurrentRide(null);
      setBookingStep(0);
    } catch (error) {
      console.error('Error cancelling ride:', error);
      Alert.alert('Lỗi', 'Không thể hủy chuyến đi. Vui lòng thử lại.');
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
        .custom-marker {
          width: 24px;
          height: 24px;
          background-color: rgba(26, 115, 232, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-inner {
          width: 12px;
          height: 12px;
          background-color: #1a73e8;
          border: 2px solid white;
          border-radius: 50%;
        }
        .driver-marker {
          width: 40px;
          height: 40px;
          background-color: ${serviceInfo ? serviceInfo.color : '#4CAF50'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
        }
        .driver-marker::after {
          content: '';
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          border: 2px solid ${serviceInfo ? serviceInfo.color : '#4CAF50'};
          border-radius: 50%;
          opacity: 0.5;
        }
        .destination-marker {
          color: #E53935;
          font-size: 24px;
        }
        .current-location-pulse {
          width: 24px;
          height: 24px;
          background-color: #1a73e8;
          border-radius: 50%;
          position: relative;
        }
        .current-location-pulse::after {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          width: 40px;
          height: 40px;
          background-color: rgba(26, 115, 232, 0.2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
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
          center: [${location ? location.longitude : DEFAULT_LOCATION.longitude}, 
                  ${location ? location.latitude : DEFAULT_LOCATION.latitude}],
          zoom: 15
        });

        // Add navigation control
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Current location marker with pulse effect
        let currentLocationMarker = null;
        
        function createCurrentLocationMarker(longitude, latitude) {
          if (currentLocationMarker) {
            currentLocationMarker.remove();
          }
          
          const el = document.createElement('div');
          el.className = 'current-location-pulse';
          
          currentLocationMarker = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Vị trí của bạn</strong>'))
            .addTo(map);
        }

        // Create initial marker if we have location
        if (${location !== null}) {
          createCurrentLocationMarker(${location ? location.longitude : DEFAULT_LOCATION.longitude}, 
                                    ${location ? location.latitude : DEFAULT_LOCATION.latitude});
        }

        // Function to update current location
        window.updateCurrentLocation = function(longitude, latitude) {
          if (currentLocationMarker) {
            currentLocationMarker.setLngLat([longitude, latitude]);
          } else {
            createCurrentLocationMarker(longitude, latitude);
          }
        };

        // Function to zoom to current location
        window.zoomToCurrentLocation = function(longitude, latitude) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            duration: 1500
          });
        };

        // Function to update driver markers
        window.updateDriverMarkers = function(drivers) {
          // Remove old markers
          Object.values(driverMarkers).forEach(marker => marker.remove());
          
          // Add new markers
          drivers.forEach(driver => {
            if (driver.location) {
              const el = document.createElement('div');
              el.className = 'driver-marker';
              el.innerHTML = '${serviceInfo?.icon === 'motorcycle' ? '🏍️' : '🚗'}';
              
              const marker = new mapboxgl.Marker(el)
                .setLngLat([driver.location.longitude, driver.location.latitude])
                .setPopup(new mapboxgl.Popup({
                  offset: 25,
                  closeButton: false,
                  closeOnClick: false
                }).setHTML(\`
                  <div style="padding: 12px;">
                    <strong style="color: ${serviceInfo ? serviceInfo.color : '#4CAF50'}">
                      \${driver.displayName || 'Tài xế ' + driver.id.substr(0, 5)}
                    </strong><br>
                    <div style="display: flex; align-items: center; margin-top: 5px;">
                      <span style="color: #666; font-size: 13px;">
                        \${driver.vehicle?.name || serviceInfo?.name || 'Không xác định'}
                      </span>
                    </div>
                  </div>
                \`))
                .addTo(map);
              
              marker.togglePopup();
              driverMarkers[driver.id] = marker;
            }
          });

          // Fit bounds to include all markers if we have drivers
          if (drivers.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            drivers.forEach(driver => {
              if (driver.location) {
                bounds.extend([driver.location.longitude, driver.location.latitude]);
              }
            });
            // Also include current location
            bounds.extend([${location ? location.longitude : DEFAULT_LOCATION.longitude}, 
                         ${location ? location.latitude : DEFAULT_LOCATION.latitude}]);
            map.fitBounds(bounds, { padding: 100 });
          }
        };

        // Object to store driver markers
        const driverMarkers = {};

        // Notify that map is ready
        map.on('load', () => {
          window.ReactNativeWebView.postMessage('MAP_READY');
        });
      </script>
    </body>
    </html>
  `;

  const getRideStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return '#1a73e8';  // Blue
      case 'ongoing':
        return '#4CAF50';  // Green
      case 'completed':
        return '#4CAF50';  // Green
      case 'cancelled':
        return '#f44336';  // Red
      default:
        return '#666';     // Gray
    }
  };

  const getRideStatusText = (status) => {
    switch (status) {
      case 'accepted':
        return 'Tài xế đang đến đón';
      case 'ongoing':
        return 'Đang trong chuyến';
      case 'completed':
        return 'Chuyến đi đã hoàn thành';
      case 'cancelled':
        return 'Chuyến đi đã hủy';
      default:
        return 'Không xác định';
    }
  };

  const getRideStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return 'directions-car';
      case 'ongoing':
        return 'near-me';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help';
    }
  };

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
          {currentRide ? (
            <View style={[
              styles.rideStatusHeader,
              currentRide.status === 'cancelled' && styles.rideStatusCancelled
            ]}>
              <MaterialIcons 
                name={getRideStatusIcon(currentRide.status)}
                size={24} 
                color={getRideStatusColor(currentRide.status)}
              />
              <Text style={[
                styles.rideStatusText,
                { color: getRideStatusColor(currentRide.status) }
              ]}>
                {getRideStatusText(currentRide.status)}
              </Text>
            </View>
          ) : serviceInfo && (
            <View style={styles.selectedService}>
              <View style={[styles.serviceIconSmall, { backgroundColor: serviceInfo.color }]}>
                {serviceInfo.iconType === 'FontAwesome5' ? (
                  <FontAwesome5 name={serviceInfo.icon} size={16} color="#fff" />
                ) : (
                  <MaterialIcons name={serviceInfo.icon} size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.selectedServiceText}>{serviceInfo.name}</Text>
            </View>
          )}
        </View>
        {!currentRide && (
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Bạn muốn đi đâu?"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchPlaces(text);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
              >
                <MaterialIcons name="clear" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </BlurView>

      {suggestions.length > 0 && !currentRide && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handlePlaceSelect(suggestion)}
            >
              <MaterialIcons name="place" size={20} color="#1a73e8" />
              <View style={styles.suggestionTextContainer}>
                <Text style={styles.suggestionMainText}>
                  {suggestion.description}
                </Text>
                <Text style={styles.suggestionSubText}>
                  {suggestion.structured_formatting?.secondary_text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
              setMapReady(true);
            }
          }}
        />
      )}

      <View style={styles.bottomContainer}>
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.zoomButton}
            onPress={handleZoomIn}
          >
            <MaterialIcons name="add" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.zoomButton}
            onPress={handleZoomOut}
          >
            <MaterialIcons name="remove" size={24} color="#1a73e8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={handleCurrentLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#1a73e8" />
        </TouchableOpacity>

        {bookingStep === 0 && selectedPlace && (
          <Animated.View style={[styles.bookingCard, {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            }],
          }]}>
            <View style={styles.bookingHeader}>
              <MaterialIcons name="place" size={24} color="#1a73e8" />
              <Text style={styles.bookingTitle}>Điểm đến</Text>
            </View>
            <Text style={styles.bookingAddress}>{selectedPlace.description}</Text>
            
            {serviceInfo && (
              <TouchableOpacity 
                style={[styles.bookingButton, { backgroundColor: serviceInfo.color }]}
                onPress={() => setBookingStep(1)}
              >
                <Text style={styles.bookingButtonText}>TIẾP TỤC</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {bookingStep === 1 && (
          <Animated.View style={[styles.bookingCard, {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            }],
          }]}>
            <View style={styles.confirmationDetails}>
              <View style={styles.locationDetails}>
                <View style={styles.locationPoint}>
                  <MaterialIcons name="my-location" size={20} color="#1a73e8" />
                  <Text style={styles.locationText}>
                    {location.address || 'Vị trí hiện tại'}
                  </Text>
                </View>
                <View style={styles.locationDivider} />
                <View style={styles.locationPoint}>
                  <MaterialIcons name="place" size={20} color="#1a73e8" />
                  <Text style={styles.locationText}>
                    {selectedPlace.description}
                  </Text>
                </View>
              </View>

              <View style={styles.estimatesContainer}>
                <View style={styles.estimateItem}>
                  <MaterialIcons name="straighten" size={20} color="#666" />
                  <Text style={styles.estimateValue}>{estimatedDistance} km</Text>
                </View>
                <View style={styles.estimateItem}>
                  <MaterialIcons name="timer" size={20} color="#666" />
                  <Text style={styles.estimateValue}>{estimatedDuration} phút</Text>
                </View>
                <View style={styles.estimateItem}>
                  <MaterialIcons name="payment" size={20} color="#666" />
                  <Text style={styles.estimateValue}>
                    {estimatedPrice?.toLocaleString()}đ
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.bookingButton, { backgroundColor: serviceInfo.color }]}
                onPress={handleBooking}
              >
                <Text style={styles.bookingButtonText}>ĐẶT XE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {bookingStep === 2 && (
          <Animated.View style={[styles.bookingCard, {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            }],
          }]}>
            <View style={styles.searchingContainer}>
              <MaterialIcons name="search" size={48} color="#1a73e8" />
              <Text style={styles.searchingText}>Đang tìm tài xế...</Text>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelRide}
              >
                <Text style={styles.cancelButtonText}>HỦY ĐẶT XE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {currentRide && (currentRide.status === 'accepted' || currentRide.status === 'ongoing') && (
          <Animated.View style={[styles.bookingCard, {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            }],
          }]}>
            <View style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.avatarText}>
                      {currentRide.driverName?.charAt(0).toUpperCase() || 'T'}
                    </Text>
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>
                      {currentRide.driverName || 'Tài xế'}
                    </Text>
                    <View style={styles.driverContact}>
                      <MaterialIcons name="phone" size={16} color="#666" />
                      <Text style={styles.driverContactText}>
                        {currentRide.driverPhone || 'Đang cập nhật...'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.vehicleInfo}>
                  <View style={[styles.vehicleBadge, { backgroundColor: serviceInfo?.color || '#4CAF50' }]}>
                    {currentRide.vehicle?.iconType === 'FontAwesome5' ? (
                      <FontAwesome5 
                        name={currentRide.vehicle?.icon || 'motorcycle'} 
                        size={16} 
                        color="#fff" 
                      />
                    ) : (
                      <MaterialIcons 
                        name={currentRide.vehicle?.icon || 'motorcycle'} 
                        size={16} 
                        color="#fff" 
                      />
                    )}
                  </View>
                  <Text style={styles.vehicleName}>
                    {currentRide.serviceName || 'Xe máy'}
                  </Text>
                </View>
              </View>

              <View style={styles.tripProgress}>
                <View style={styles.progressHeader}>
                  <MaterialIcons name="near-me" size={20} color="#1a73e8" />
                  <Text style={styles.progressText}>
                    {currentRide.status === 'accepted' ? 'Tài xế đang đến điểm đón' : 'Đang trên đường đến điểm đến'}
                  </Text>
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
                    </View>
                  </View>
                </View>

                <View style={styles.progressDetails}>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="straighten" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {currentRide.distance} km
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="timer" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {currentRide.duration} phút
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="attach-money" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {currentRide.price?.toLocaleString()}đ
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelRide}
              >
                <Text style={styles.cancelButtonText}>HỦY CHUYẾN</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {currentRide && currentRide.status === 'cancelled' && (
          <Animated.View style={[styles.bookingCard, styles.cancelledCard, {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            }],
          }]}>
            <View style={styles.cancelledContent}>
              <MaterialIcons name="cancel" size={48} color="#f44336" />
              <Text style={styles.cancelledTitle}>Chuyến đi đã bị hủy</Text>
              <Text style={styles.cancelledMessage}>
                Vui lòng đặt chuyến khác
              </Text>
            </View>
          </Animated.View>
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
    marginBottom: 15,
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
  selectedService: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  serviceIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedServiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 10,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 160 : 140,
    left: 20,
    right: 20,
    zIndex: 2,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: 300,
    marginTop: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  suggestionSubText: {
    fontSize: 14,
    color: '#666',
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
  mapControls: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 300 : 280,
    backgroundColor: '#fff',
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  zoomButton: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 240 : 220,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bookingCard: {
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
    marginTop: 20,
  },
  bookingHeader: {
    marginBottom: 20,
  },
  bookingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  bookingAddress: {
    fontSize: 16,
    color: '#666',
    paddingLeft: 34,
  },
  bookingButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    padding: 20,
    color: 'red',
    textAlign: 'center',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    paddingLeft: 34,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  currentLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 115, 232, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a73e8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationDetails: {
    padding: 15,
  },
  locationDetails: {
    marginBottom: 20,
  },
  locationPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  locationText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  locationDivider: {
    width: 2,
    height: 20,
    backgroundColor: '#1a73e8',
    marginLeft: 9,
  },
  estimatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  estimateItem: {
    alignItems: 'center',
  },
  estimateValue: {
    marginTop: 5,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  searchingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  searchingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 15,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rideProgress: {
    padding: 15,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  driverDetails: {
    marginLeft: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rideStatus: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  driverHeader: {
    marginBottom: 20,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  driverContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverContactText: {
    fontSize: 14,
    color: '#666',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  vehicleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  vehicleName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tripProgress: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rideStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rideStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
    marginLeft: 8,
  },
  rideStatusCancelled: {
    backgroundColor: '#ffebee',
  },
  cancelledCard: {
    backgroundColor: '#fff',
    marginBottom: 120,
  },
  cancelledContent: {
    alignItems: 'center',
    padding: 20,
  },
  cancelledTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginTop: 15,
    marginBottom: 5,
  },
  cancelledMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  locationSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontWeight: '500',
  },
  locationDivider: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    marginLeft: 15,
  },
  dividerLine: {
    width: 2,
    height: 15,
    backgroundColor: '#ddd',
  },
}); 