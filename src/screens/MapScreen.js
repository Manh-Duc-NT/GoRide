import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import * as Location from 'expo-location';
import WebView from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const GOONG_API_KEY = 'LTvoiyw3BLpFYjlrkA7i0HuAUmRhyjmf5ZutLW0V'; // Replace with your Goong API key

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const { user } = useAuth();

  // Khởi tạo và yêu cầu quyền truy cập vị trí
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Cần cấp quyền truy cập vị trí để sử dụng tính năng này');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      
      // Cập nhật vị trí lên Firestore
      if (user) {
        await updateUserLocation(location.coords);
      }
    })();
  }, []);

  // Theo dõi vị trí theo thời gian thực
  useEffect(() => {
    let locationSubscription;

    const startLocationTracking = async () => {
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          if (user) {
            updateUserLocation(newLocation.coords);
          }
        }
      );
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [user]);

  // Cập nhật vị trí người dùng lên Firestore
  const updateUserLocation = async (coords) => {
    try {
      const userLocationRef = doc(db, 'userLocations', user.uid);
      await setDoc(userLocationRef, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString(),
        userType: user.role, // 'CUSTOMER' hoặc 'DRIVER'
      }, { merge: true });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Tìm kiếm địa điểm với Goong API
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

  // HTML cho bản đồ Goong
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
      <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet">
      <style>
        body { margin: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        goongjs.accessToken = '${GOONG_API_KEY}';
        const map = new goongjs.Map({
          container: 'map',
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: [${location ? location.coords.longitude : 105.83991}, ${location ? location.coords.latitude : 21.02800}],
          zoom: 15
        });

        // Thêm marker cho vị trí hiện tại
        if (${location !== null}) {
          new goongjs.Marker()
            .setLngLat([${location ? location.coords.longitude : 105.83991}, ${location ? location.coords.latitude : 21.02800}])
            .addTo(map);
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm địa điểm..."
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

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => {
                setSearchQuery(suggestion.description);
                setSuggestions([]);
              }}
            >
              <MaterialIcons name="place" size={20} color="#666" />
              <Text style={styles.suggestionText}>{suggestion.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : (
        <WebView
          style={styles.map}
          source={{ html: mapHTML }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  clearButton: {
    padding: 10,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  map: {
    flex: 1,
  },
  errorText: {
    padding: 20,
    color: 'red',
    textAlign: 'center',
  },
}); 