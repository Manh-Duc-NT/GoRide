import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const VEHICLE_FIELDS = {
  brand: {
    icon: 'car-side',
    label: 'Hãng xe',
    required: true,
    placeholder: 'VD: Toyota, Honda...'
  },
  model: {
    icon: 'car-info',
    label: 'Mẫu xe',
    required: true,
    placeholder: 'VD: Vios, City...'
  },
  year: {
    icon: 'calendar',
    label: 'Năm sản xuất',
    required: true,
    placeholder: 'VD: 2020',
    keyboardType: 'numeric'
  },
  color: {
    icon: 'palette',
    label: 'Màu sắc',
    required: true,
    placeholder: 'VD: Trắng, Đen...'
  },
  licensePlate: {
    icon: 'card-text',
    label: 'Biển số xe',
    required: true,
    placeholder: 'VD: 51F-123.45'
  },
  registrationNumber: {
    icon: 'file-document',
    label: 'Số đăng ký',
    required: true,
    placeholder: 'Nhập số đăng ký xe'
  },
  insuranceNumber: {
    icon: 'shield-check',
    label: 'Số bảo hiểm',
    required: true,
    placeholder: 'Nhập số bảo hiểm'
  },
  lastMaintenanceDate: {
    icon: 'wrench',
    label: 'Ngày bảo dưỡng gần nhất',
    placeholder: 'VD: 01/01/2024'
  }
};

export default function VehicleInfo({ navigation }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState({
    brand: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    registrationNumber: '',
    insuranceNumber: '',
    lastMaintenanceDate: ''
  });

  useEffect(() => {
    loadVehicleInfo();
  }, []);

  const loadVehicleInfo = async () => {
    try {
      if (!user?.uid) return;

      setIsLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists() && docSnap.data().vehicle) {
        setVehicleInfo(docSnap.data().vehicle);
      }
    } catch (error) {
      console.error('Error loading vehicle info:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin phương tiện. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user?.uid) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng.');
        return;
      }

      // Validate required fields
      const emptyFields = Object.entries(VEHICLE_FIELDS)
        .filter(([key, field]) => field.required && !vehicleInfo[key]?.trim())
        .map(([_, field]) => field.label);

      if (emptyFields.length > 0) {
        Alert.alert('Thông báo', `Vui lòng điền đầy đủ các trường sau:\n${emptyFields.join('\n')}`);
        return;
      }

      setIsLoading(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        vehicle: {
          ...vehicleInfo,
          updatedAt: new Date().toISOString()
        }
      });
      
      setIsEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin phương tiện.');
    } catch (error) {
      console.error('Error updating vehicle info:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin phương tiện. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field, value, config) => {
    return (
      <View style={styles.field} key={field}>
        <Text style={styles.label}>
          {config.label} {config.required && <Text style={styles.required}>*</Text>}
        </Text>
        {isEditing ? (
          <View style={[
            styles.inputContainer,
            { borderColor: config.required && !value ? '#ff4444' : '#1a73e8' }
          ]}>
            <MaterialCommunityIcons 
              name={config.icon} 
              size={20} 
              color="#666"
              style={styles.fieldIcon} 
            />
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => setVehicleInfo(prev => ({...prev, [field]: text}))}
              placeholder={config.placeholder}
              placeholderTextColor="#999"
              keyboardType={config.keyboardType || 'default'}
            />
          </View>
        ) : (
          <View style={styles.valueContainer}>
            <MaterialCommunityIcons 
              name={config.icon} 
              size={20} 
              color="#1a73e8"
              style={styles.fieldIcon} 
            />
            <Text style={styles.value}>{value || 'Chưa cập nhật'}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          disabled={isLoading}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin phương tiện</Text>
        <TouchableOpacity 
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
          disabled={isLoading}
          style={styles.headerButton}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name={isEditing ? "check" : "edit"} size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.vehicleIconContainer}>
            <MaterialCommunityIcons name="car-estate" size={48} color="#1a73e8" />
          </View>
          
          {Object.entries(VEHICLE_FIELDS).map(([field, config]) => 
            renderField(field, vehicleInfo[field], config)
          )}
        </View>

        {isEditing && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              setIsEditing(false);
              loadVehicleInfo();
            }}
            disabled={isLoading}
          >
            <MaterialCommunityIcons name="close" size={20} color="#ff4444" />
            <Text style={styles.cancelButtonText}>Hủy thay đổi</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a73e8',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vehicleIconContainer: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  required: {
    color: '#ff4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  fieldIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
    paddingRight: 12,
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ff4444',
    marginLeft: 8,
  },
}); 