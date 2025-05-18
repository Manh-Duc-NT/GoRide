import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadDriverDocuments } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

export default function DriverVerification({ navigation }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState({
    idCard: null,
    driverLicense: null,
  });
  const [error, setError] = useState('');

  const pickImage = async (documentType) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập',
          'Chúng tôi cần quyền truy cập thư viện ảnh để tải lên giấy tờ của bạn'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setDocuments(prev => ({
          ...prev,
          [documentType]: result.assets[0],
        }));
      }
    } catch (error) {
      setError('Không thể tải ảnh lên. Vui lòng thử lại');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!documents.idCard || !documents.driverLicense) {
        setError('Vui lòng tải lên đầy đủ giấy tờ');
        return;
      }

      await uploadDriverDocuments(user.uid, {
        idCard: documents.idCard,
        driverLicense: documents.driverLicense,
      });

      Alert.alert(
        'Thành công',
        'Giấy tờ của bạn đã được gửi đi. Chúng tôi sẽ xem xét và phản hồi sớm nhất.',
        [{ 
          text: 'OK', 
          onPress: () => {
            navigation.replace('VerificationPending');
          }
        }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      setError('Có lỗi xảy ra. Vui lòng thử lại');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Xác thực tài xế</Text>
        <Text style={styles.subtitle}>
          Để đảm bảo an toàn cho cộng đồng, vui lòng cung cấp các giấy tờ sau
        </Text>
      </View>

      <View style={styles.documentSection}>
        <View style={styles.documentHeader}>
          <MaterialIcons name="credit-card" size={24} color="#1a73e8" />
          <Text style={styles.documentTitle}>CCCD/CMND</Text>
        </View>
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={() => pickImage('idCard')}
        >
          {documents.idCard ? (
            <>
              <Image source={{ uri: documents.idCard.uri }} style={styles.preview} />
              <TouchableOpacity 
                style={styles.changeButton}
                onPress={() => pickImage('idCard')}
              >
                <Text style={styles.changeButtonText}>Thay đổi ảnh</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.uploadContent}>
              <MaterialIcons name="add-photo-alternate" size={40} color="#666" />
              <Text style={styles.uploadButtonText}>Tải lên CCCD/CMND</Text>
              <Text style={styles.uploadHint}>Chụp rõ mặt trước CCCD/CMND</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.documentSection}>
        <View style={styles.documentHeader}>
          <MaterialIcons name="directions-car" size={24} color="#1a73e8" />
          <Text style={styles.documentTitle}>Giấy phép lái xe</Text>
        </View>
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={() => pickImage('driverLicense')}
        >
          {documents.driverLicense ? (
            <>
              <Image source={{ uri: documents.driverLicense.uri }} style={styles.preview} />
              <TouchableOpacity 
                style={styles.changeButton}
                onPress={() => pickImage('driverLicense')}
              >
                <Text style={styles.changeButtonText}>Thay đổi ảnh</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.uploadContent}>
              <MaterialIcons name="add-photo-alternate" size={40} color="#666" />
              <Text style={styles.uploadButtonText}>Tải lên giấy phép lái xe</Text>
              <Text style={styles.uploadHint}>Chụp rõ mặt trước giấy phép</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity 
        style={[
          styles.submitButton,
          (!documents.idCard || !documents.driverLicense) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!documents.idCard || !documents.driverLicense}
      >
        <Text style={styles.submitButtonText}>Gửi xác thực</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Lưu ý: Thông tin của bạn sẽ được bảo mật và chỉ sử dụng cho mục đích xác thực
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  documentSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: '#1a73e8',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: '#f8f9ff',
    overflow: 'hidden',
  },
  uploadContent: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  uploadHint: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  preview: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  changeButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  changeButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    padding: 15,
    margin: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 20,
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    fontStyle: 'italic',
  },
}); 