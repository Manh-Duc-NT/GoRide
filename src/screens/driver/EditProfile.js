import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ICON_FIELDS = {
  displayName: 'account',
  phoneNumber: 'phone',
  email: 'email',
  address: 'map-marker',
  idNumber: 'card-account-details',
  licenseNumber: 'car',
  experience: 'briefcase-clock'
};

export default function EditProfile({ navigation }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    phoneNumber: '',
    email: '',
    address: '',
    idNumber: '',
    licenseNumber: '',
    experience: ''
  });

  useEffect(() => {
    loadDriverProfile();
  }, []);

  const loadDriverProfile = async () => {
    try {
      if (!user?.uid) return;
      
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          displayName: data.displayName || '',
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          address: data.address || '',
          idNumber: data.idNumber || '',
          licenseNumber: data.licenseNumber || '',
          experience: data.experience || ''
        });
      }
    } catch (error) {
      console.error('Error loading driver profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tài xế. Vui lòng thử lại sau.');
    }
  };

  const handleSave = async () => {
    try {
      if (!user?.uid) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng.');
        return;
      }

      // Validate required fields
      const requiredFields = ['displayName', 'phoneNumber', 'email', 'idNumber', 'licenseNumber'];
      const emptyFields = requiredFields.filter(field => !profileData[field]?.trim());
      
      if (emptyFields.length > 0) {
        Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
        return;
      }

      setIsLoading(true);
      const userRef = doc(db, 'users', user.uid);
      
      const updateData = {
        displayName: profileData.displayName.trim(),
        phoneNumber: profileData.phoneNumber.trim(),
        email: profileData.email.trim(),
        address: profileData.address.trim(),
        idNumber: profileData.idNumber.trim(),
        licenseNumber: profileData.licenseNumber.trim(),
        experience: profileData.experience.trim(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân.');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      if (!user?.uid) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setIsLoading(true);
        const storage = getStorage();
        const imageRef = ref(storage, `users/${user.uid}/profile.jpg`);
        
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(imageRef);
        
        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
        
        Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện.');
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (label, value, field, keyboardType = 'default', isRequired = false) => {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {label} {isRequired && <Text style={styles.required}>*</Text>}
        </Text>
        <View style={[
          styles.inputContainer,
          { borderColor: isRequired && !value ? '#ff4444' : '#1a73e8' }
        ]}>
          <MaterialCommunityIcons 
            name={ICON_FIELDS[field]} 
            size={20} 
            color="#666"
            style={styles.fieldIcon} 
          />
          <TextInput
            style={styles.input}
            value={value || ''}
            onChangeText={(text) => setProfileData(prev => ({...prev, [field]: text}))}
            placeholder={`Nhập ${label.toLowerCase()}`}
            keyboardType={keyboardType}
            placeholderTextColor="#999"
          />
        </View>
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
        <Text style={styles.headerTitle}>Chỉnh sửa thông tin</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isLoading}
          style={styles.headerButton}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="check" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handlePickImage} 
            disabled={isLoading}
          >
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <MaterialCommunityIcons name="account-circle" size={80} color="#1a73e8" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <MaterialIcons name="camera-alt" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarText}>Chạm để thay đổi ảnh đại diện</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={20} color="#1a73e8" />
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          </View>
          {renderField('Họ và tên', profileData.displayName, 'displayName', 'default', true)}
          {renderField('Số điện thoại', profileData.phoneNumber, 'phoneNumber', 'phone-pad', true)}
          {renderField('Email', profileData.email, 'email', 'email-address', true)}
          {renderField('Địa chỉ', profileData.address, 'address')}
          
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <MaterialIcons name="badge" size={20} color="#1a73e8" />
            <Text style={styles.sectionTitle}>Giấy tờ</Text>
          </View>
          {renderField('CMND/CCCD', profileData.idNumber, 'idNumber', 'numeric', true)}
          {renderField('Số GPLX', profileData.licenseNumber, 'licenseNumber', 'default', true)}
          {renderField('Kinh nghiệm lái xe', profileData.experience, 'experience')}
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: '#1a73e8',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
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
}); 