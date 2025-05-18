import React, { useState, useRef, memo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const InputField = memo(({ icon, label, value, onChangeText, keyboardType = 'default', editable = true }) => {
  const inputRef = useRef(null);
  
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <MaterialIcons name={icon} size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.input, !editable && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={editable}
          placeholder={label}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
      </View>
    </View>
  );
});

export default function EditProfile({ navigation }) {
  const { user, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: user?.phoneNumber || '',
    email: user?.email || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth || '',
    photoURL: user?.photoURL || null,
  });

  const handleImagePick = async () => {
    try {
      setUploadingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        // Tạm thời chỉ lưu URI của ảnh vào state
        setFormData(prev => ({
          ...prev,
          photoURL: result.assets[0].uri
        }));
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại sau.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInputChange = (field) => (text) => {
    setFormData(prev => ({ ...prev, [field]: text }));
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storage = getStorage();
      const imageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Không thể tải ảnh lên. Vui lòng thử lại sau.');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Nếu có ảnh mới, upload ảnh trước
      let photoURL = formData.photoURL;
      if (photoURL && photoURL !== user?.photoURL) {
        photoURL = await uploadImage(formData.photoURL);
      }

      await updateUserProfile(user.uid, {
        ...formData,
        photoURL,
        updatedAt: new Date().toISOString(),
      });
      
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {formData.photoURL ? (
              <Image 
                source={{ uri: formData.photoURL }} 
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {(formData.displayName || user.email).charAt(0).toUpperCase()}
              </Text>
            )}
            <TouchableOpacity 
              style={[styles.avatarEditButton, uploadingImage && styles.avatarEditButtonDisabled]}
              onPress={handleImagePick}
              disabled={uploadingImage}
            >
              <MaterialIcons 
                name={uploadingImage ? "hourglass-empty" : "camera-alt"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <InputField
            icon="person"
            label="Họ và tên"
            value={formData.displayName}
            onChangeText={handleInputChange('displayName')}
          />

          <InputField
            icon="phone"
            label="Số điện thoại"
            value={formData.phoneNumber}
            onChangeText={handleInputChange('phoneNumber')}
            keyboardType="phone-pad"
          />

          <InputField
            icon="email"
            label="Email"
            value={formData.email}
            editable={false}
          />

          <InputField
            icon="wc"
            label="Giới tính"
            value={formData.gender}
            onChangeText={handleInputChange('gender')}
          />

          <InputField
            icon="cake"
            label="Ngày sinh"
            value={formData.dateOfBirth}
            onChangeText={handleInputChange('dateOfBirth')}
          />

          <TouchableOpacity 
            style={[styles.saveButton, (loading || uploadingImage) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading || uploadingImage}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a73e8',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a73e8',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarEditButtonDisabled: {
    backgroundColor: '#ccc',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 20,
    marginTop: -50,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 