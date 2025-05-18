import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function VerificationPending({ navigation }) {
  const { user } = useAuth();
  const [driverData, setDriverData] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Listen to verification status changes from users collection
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDriverData(data);
        if (data.role === 'driver' && data.verificationStatus === 'approved') {
          navigation.replace('DriverTabs');
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="access-time" size={80} color="#1a73e8" />
        <Text style={styles.title}>Đang chờ xác minh</Text>
        <Text style={styles.description}>
          Chúng tôi đang xem xét thông tin của bạn. Quá trình này có thể mất từ 24-48 giờ.
        </Text>

        <View style={styles.infoContainer}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="email" size={24} color="#666" />
            <Text style={styles.infoText}>{driverData?.email || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="verified-user" size={24} color="#666" />
            <Text style={styles.infoText}>
              Trạng thái: {driverData?.verificationStatus === 'pending' ? 'Đang chờ xác minh' : 'Đã xác minh'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="update" size={24} color="#666" />
            <Text style={styles.infoText}>
              Ngày tạo: {formatDate(driverData?.createdAt)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="update" size={24} color="#666" />
            <Text style={styles.infoText}>
              Cập nhật: {formatDate(driverData?.updatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.documentsContainer}>
          <Text style={styles.sectionTitle}>Giấy tờ đã tải lên</Text>
          
          {driverData?.documents?.idCard && (
            <View style={styles.documentItem}>
              <MaterialIcons name="badge" size={24} color="#666" />
              <Text style={styles.documentText}>CMND/CCCD đã tải lên</Text>
              <Image 
                source={{ uri: driverData.documents.idCard }} 
                style={styles.documentImage}
              />
            </View>
          )}

          {driverData?.documents?.driverLicense && (
            <View style={styles.documentItem}>
              <MaterialIcons name="card-membership" size={24} color="#666" />
              <Text style={styles.documentText}>Bằng lái xe đã tải lên</Text>
              <Image 
                source={{ uri: driverData.documents.driverLicense }} 
                style={styles.documentImage}
              />
            </View>
          )}
        </View>
      </View>

      <Text style={styles.footer}>
        Bạn sẽ nhận được thông báo khi tài khoản được xác minh
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  documentsContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  documentItem: {
    marginBottom: 20,
  },
  documentText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    marginVertical: 10,
  },
  documentImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  footer: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
}); 