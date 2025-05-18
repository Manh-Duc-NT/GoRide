import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';

const GOONG_API_KEY = 'LTvoiyw3BLpFYjlrkA7i0HuAUmRhyjmf5ZutLW0V';

export default function SavedAddresses({ navigation }) {
  const { user, updateUserAddresses } = useAuth();
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress || '');
  const [workAddress, setWorkAddress] = useState(user?.workAddress || '');
  const [loading, setLoading] = useState(false);
  const [homeSuggestions, setHomeSuggestions] = useState([]);
  const [workSuggestions, setWorkSuggestions] = useState([]);
  const [focusedInput, setFocusedInput] = useState(null);
  const [isEditing, setIsEditing] = useState({ home: false, work: false });

  const searchPlaces = async (query, type) => {
    if (!query.trim()) {
      type === 'home' ? setHomeSuggestions([]) : setWorkSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      if (type === 'home') {
        setHomeSuggestions(data.predictions || []);
      } else {
        setWorkSuggestions(data.predictions || []);
      }
    } catch (error) {
      console.error('Error searching places:', error);
    }
  };

  const handleSetHomeLocation = async (location, address) => {
    try {
      setLoading(true);
      const updates = {
        homeAddress: address,
        homeLocation: {
          latitude: location.lat,
          longitude: location.lng,
        }
      };
      
      const updatedProfile = await updateUserAddresses(user.uid, updates);
      if (updatedProfile) {
        setHomeAddress(address);
        setIsEditing({ ...isEditing, home: false });
        Alert.alert('Thành công', 'Đã lưu địa chỉ nhà');
      }
    } catch (error) {
      console.error('Error saving home address:', error);
      Alert.alert('Lỗi', 'Không thể lưu địa chỉ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetWorkLocation = async (location, address) => {
    try {
      setLoading(true);
      const updates = {
        workAddress: address,
        workLocation: {
          latitude: location.lat,
          longitude: location.lng,
        }
      };
      
      const updatedProfile = await updateUserAddresses(user.uid, updates);
      if (updatedProfile) {
        setWorkAddress(address);
        setIsEditing({ ...isEditing, work: false });
        Alert.alert('Thành công', 'Đã lưu địa chỉ công ty');
      }
    } catch (error) {
      console.error('Error saving work address:', error);
      Alert.alert('Lỗi', 'Không thể lưu địa chỉ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelect = async (place, type) => {
    try {
      const response = await fetch(
        `https://rsapi.goong.io/Place/Detail?place_id=${place.place_id}&api_key=${GOONG_API_KEY}`
      );
      const data = await response.json();
      
      if (data.result) {
        const location = data.result.geometry.location;
        if (type === 'home') {
          setHomeSuggestions([]);
          await handleSetHomeLocation(location, place.description);
        } else {
          setWorkSuggestions([]);
          await handleSetWorkLocation(location, place.description);
        }
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Lỗi', 'Không thể lấy thông tin địa điểm');
    }
  };

  const getCurrentLocation = async (type) => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Cần cấp quyền truy cập vị trí để sử dụng tính năng này');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      // Chuyển đổi tọa độ thành địa chỉ bằng Goong Geocoding API
      const response = await fetch(
        `https://rsapi.goong.io/Geocode?latlng=${location.coords.latitude},${location.coords.longitude}&api_key=${GOONG_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        const coords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
        
        if (type === 'home') {
          await handleSetHomeLocation(coords, address);
        } else {
          await handleSetWorkLocation(coords, address);
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (type) => {
    try {
      setLoading(true);
      const updates = type === 'home' 
        ? { homeAddress: '', homeLocation: null }
        : { workAddress: '', workLocation: null };
      
      const updatedProfile = await updateUserAddresses(user.uid, updates);
      if (updatedProfile) {
        if (type === 'home') {
          setHomeAddress('');
        } else {
          setWorkAddress('');
        }
        Alert.alert('Thành công', `Đã xóa ${type === 'home' ? 'địa chỉ nhà' : 'địa chỉ công ty'}`);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      Alert.alert('Lỗi', 'Không thể xóa địa chỉ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.addressContainer}>
          <View style={styles.addressHeader}>
            <MaterialIcons name="home" size={24} color="#1a73e8" />
            <Text style={styles.addressTitle}>Địa chỉ nhà</Text>
          </View>
          
          {!isEditing.home && homeAddress ? (
            <View style={styles.savedAddressContainer}>
              <View style={styles.savedAddressContent}>
                <MaterialIcons name="place" size={20} color="#1a73e8" />
                <Text style={styles.savedAddressText}>{homeAddress}</Text>
              </View>
              <View style={styles.savedAddressActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setIsEditing({ ...isEditing, home: true })}
                >
                  <MaterialIcons name="edit" size={20} color="#1a73e8" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteAddress('home')}
                >
                  <MaterialIcons name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập địa chỉ nhà"
                  value={homeAddress}
                  onChangeText={(text) => {
                    setHomeAddress(text);
                    searchPlaces(text, 'home');
                  }}
                  onFocus={() => setFocusedInput('home')}
                />
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={() => getCurrentLocation('home')}
                  disabled={loading}
                >
                  <MaterialIcons name="my-location" size={24} color="#1a73e8" />
                </TouchableOpacity>
              </View>
              {focusedInput === 'home' && homeSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {homeSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => {
                        handlePlaceSelect(suggestion, 'home');
                        setIsEditing({ ...isEditing, home: false });
                      }}
                    >
                      <MaterialIcons name="place" size={20} color="#1a73e8" />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionMainText}>{suggestion.description}</Text>
                        <Text style={styles.suggestionSubText}>
                          {suggestion.structured_formatting?.secondary_text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.addressContainer}>
          <View style={styles.addressHeader}>
            <MaterialIcons name="business" size={24} color="#1a73e8" />
            <Text style={styles.addressTitle}>Địa chỉ công ty</Text>
          </View>
          
          {!isEditing.work && workAddress ? (
            <View style={styles.savedAddressContainer}>
              <View style={styles.savedAddressContent}>
                <MaterialIcons name="place" size={20} color="#1a73e8" />
                <Text style={styles.savedAddressText}>{workAddress}</Text>
              </View>
              <View style={styles.savedAddressActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setIsEditing({ ...isEditing, work: true })}
                >
                  <MaterialIcons name="edit" size={20} color="#1a73e8" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteAddress('work')}
                >
                  <MaterialIcons name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập địa chỉ công ty"
                  value={workAddress}
                  onChangeText={(text) => {
                    setWorkAddress(text);
                    searchPlaces(text, 'work');
                  }}
                  onFocus={() => setFocusedInput('work')}
                />
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={() => getCurrentLocation('work')}
                  disabled={loading}
                >
                  <MaterialIcons name="my-location" size={24} color="#1a73e8" />
                </TouchableOpacity>
              </View>
              {focusedInput === 'work' && workSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {workSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => {
                        handlePlaceSelect(suggestion, 'work');
                        setIsEditing({ ...isEditing, work: false });
                      }}
                    >
                      <MaterialIcons name="place" size={20} color="#1a73e8" />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionMainText}>{suggestion.description}</Text>
                        <Text style={styles.suggestionSubText}>
                          {suggestion.structured_formatting?.secondary_text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <Text style={styles.note}>
          Nhấn vào biểu tượng định vị để lưu vị trí hiện tại của bạn
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  addressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  savedAddressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  savedAddressContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedAddressText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  savedAddressActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  locationButton: {
    marginLeft: 10,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    color: '#333',
  },
  suggestionSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  note: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
}); 