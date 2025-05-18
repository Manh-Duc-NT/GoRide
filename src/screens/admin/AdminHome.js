import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { USER_ROLES, VERIFICATION_STATUS } from '../../types/user';
import { MaterialIcons } from '@expo/vector-icons';

export default function AdminHome() {
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPendingDrivers();
  }, []);

  const loadPendingDrivers = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', USER_ROLES.DRIVER),
        where('verificationStatus', '==', VERIFICATION_STATUS.PENDING)
      );

      const querySnapshot = await getDocs(q);
      const drivers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPendingDrivers(drivers);
    } catch (error) {
      console.error('Lỗi khi tải danh sách tài xế:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerification = async (driverId, status) => {
    try {
      await updateDoc(doc(db, 'users', driverId), {
        verificationStatus: status,
        verifiedAt: new Date().toISOString(),
      });

      // Cập nhật danh sách local
      setPendingDrivers(current => 
        current.filter(driver => driver.id !== driverId)
      );
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
    }
  };

  const renderDriver = ({ item }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <View style={styles.driverInfo}>
          <MaterialIcons name="account-circle" size={40} color="#1a73e8" />
          <View style={styles.driverDetails}>
            <Text style={styles.driverEmail}>{item.email}</Text>
            <Text style={styles.driverDate}>
              Đăng ký: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Chờ duyệt</Text>
        </View>
      </View>

      <View style={styles.documents}>
        {item.documents && (
          <View style={styles.documentList}>
            <Text style={styles.documentLabel}>Giấy tờ đã nộp:</Text>
            {item.documents.idCard && (
              <TouchableOpacity style={styles.documentItem}>
                <MaterialIcons name="credit-card" size={24} color="#1a73e8" />
                <Text style={styles.documentText}>CCCD/CMND</Text>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            )}
            {item.documents.driverLicense && (
              <TouchableOpacity style={styles.documentItem}>
                <MaterialIcons name="directions-car" size={24} color="#1a73e8" />
                <Text style={styles.documentText}>Giấy phép lái xe</Text>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.approveButton]}
          onPress={() => handleVerification(item.id, VERIFICATION_STATUS.APPROVED)}
        >
          <MaterialIcons name="check-circle" size={20} color="white" />
          <Text style={styles.buttonText}>Phê duyệt</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.rejectButton]}
          onPress={() => handleVerification(item.id, VERIFICATION_STATUS.REJECTED)}
        >
          <MaterialIcons name="cancel" size={20} color="white" />
          <Text style={styles.buttonText}>Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý tài xế</Text>
        <Text style={styles.subtitle}>Xét duyệt đăng ký tài xế mới</Text>
      </View>
      
      <FlatList
        data={pendingDrivers}
        renderItem={renderDriver}
        keyExtractor={item => item.id}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadPendingDrivers();
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="check-circle" size={60} color="#4CAF50" />
            <Text style={styles.emptyText}>Không có yêu cầu xét duyệt mới</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  list: {
    flex: 1,
    padding: 15,
  },
  driverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverDetails: {
    marginLeft: 10,
  },
  driverEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  driverDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#f57c00',
    fontSize: 14,
    fontWeight: '500',
  },
  documents: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  documentList: {
    marginTop: 5,
  },
  documentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#ffffff',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 