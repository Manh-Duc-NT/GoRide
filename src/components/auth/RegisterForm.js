import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert } from 'react-native';
import { registerWithEmailPassword } from '../../services/auth';
import { USER_ROLES } from '../../types/user';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const { width } = Dimensions.get('window');

const vehicleTypes = [
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

export default function RegisterForm({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(USER_ROLES.CUSTOMER);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
      
      if (password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }

      if (role === USER_ROLES.DRIVER && !selectedVehicle) {
        setError('Vui lòng chọn loại xe');
        return;
      }

      const user = await registerWithEmailPassword(email, password, role);
      
      if (role === USER_ROLES.DRIVER) {
        // Lưu thông tin xe cho tài xế
        await setDoc(doc(db, 'users', user.uid), {
          vehicle: {
            type: selectedVehicle.id,
            name: selectedVehicle.name,
            icon: selectedVehicle.icon,
            iconType: selectedVehicle.iconType,
            color: selectedVehicle.color,
          },
          verificationStatus: 'pending',
          isOnline: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        
        navigation.navigate('DriverVerification');
      } else {
        // Lưu thông tin cơ bản cho khách hàng
        await setDoc(doc(db, 'users', user.uid), {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        Alert.alert(
          'Xác thực email',
          'Vui lòng kiểm tra email của bạn và nhấp vào liên kết xác thực để hoàn tất đăng ký.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email này đã được sử dụng');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email không hợp lệ');
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Tạo Tài Khoản</Text>
          <Text style={styles.subtitle}>Tham gia cùng GoRide ngay hôm nay</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email của bạn"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#666"
            />
          </View>
          
          <Text style={styles.roleLabel}>Bạn là:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === USER_ROLES.CUSTOMER && styles.roleButtonActive]}
              onPress={() => {
                setRole(USER_ROLES.CUSTOMER);
                setSelectedVehicle(null);
              }}
            >
              <MaterialIcons 
                name="person" 
                size={40} 
                color={role === USER_ROLES.CUSTOMER ? "#1a73e8" : "#666"}
              />
              <Text style={[styles.roleButtonText, role === USER_ROLES.CUSTOMER && styles.roleButtonTextActive]}>
                Khách hàng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === USER_ROLES.DRIVER && styles.roleButtonActive]}
              onPress={() => setRole(USER_ROLES.DRIVER)}
            >
              <MaterialCommunityIcons 
                name="car-connected" 
                size={40} 
                color={role === USER_ROLES.DRIVER ? "#1a73e8" : "#666"}
              />
              <Text style={[styles.roleButtonText, role === USER_ROLES.DRIVER && styles.roleButtonTextActive]}>
                Tài xế
              </Text>
            </TouchableOpacity>
          </View>

          {role === USER_ROLES.DRIVER && (
            <View style={styles.vehicleContainer}>
              <Text style={styles.vehicleLabel}>Chọn loại xe:</Text>
              <View style={styles.vehicleGrid}>
                {vehicleTypes.map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      styles.vehicleItem,
                      selectedVehicle?.id === vehicle.id && styles.vehicleItemSelected
                    ]}
                    onPress={() => setSelectedVehicle(vehicle)}
                  >
                    <View style={[styles.vehicleIcon, { backgroundColor: vehicle.color }]}>
                      <FontAwesome5 name={vehicle.icon} size={24} color="#fff" />
                    </View>
                    <Text style={[
                      styles.vehicleName,
                      selectedVehicle?.id === vehicle.id && styles.vehicleNameSelected
                    ]}>
                      {vehicle.name}
                    </Text>
                    <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <MaterialIcons name="person-add" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>ĐĂNG KÝ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Đã có tài khoản? <Text style={styles.loginHighlight}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 15,
  },
  inputIcon: {
    padding: 15,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  roleLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  roleButtonActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#f8f9ff',
  },
  roleButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  roleButtonTextActive: {
    color: '#1a73e8',
    fontWeight: 'bold',
  },
  vehicleContainer: {
    marginBottom: 25,
  },
  vehicleLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vehicleItem: {
    width: (width - 70) / 2,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vehicleItemSelected: {
    borderColor: '#1a73e8',
    backgroundColor: '#f8f9ff',
  },
  vehicleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  vehicleNameSelected: {
    color: '#1a73e8',
  },
  vehicleDescription: {
    fontSize: 13,
    color: '#666',
  },
  registerButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginHighlight: {
    color: '#1a73e8',
    fontWeight: 'bold',
  },
  error: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 15,
  },
}); 