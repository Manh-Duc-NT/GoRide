import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const EMERGENCY_CONTACTS = [
  {
    id: '1',
    name: 'Cảnh sát',
    phone: '113',
    icon: 'local-police'
  },
  {
    id: '2',
    name: 'Cứu thương',
    phone: '115',
    icon: 'medical-services'
  },
  {
    id: '3',
    name: 'Cứu hỏa',
    phone: '114',
    icon: 'local-fire-department'
  },
  {
    id: '4',
    name: 'Tổng đài GoRide',
    phone: '1900xxxx',
    icon: 'headset-mic'
  }
];

export default function CustomerEmergency() {
  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="warning" size={40} color="#FF3B30" />
        <Text style={styles.headerTitle}>Liên hệ Khẩn cấp</Text>
        <Text style={styles.headerSubtitle}>
          Trong trường hợp khẩn cấp, hãy liên hệ ngay với các số điện thoại bên dưới
        </Text>
      </View>

      <View style={styles.contactsContainer}>
        {EMERGENCY_CONTACTS.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.contactCard}
            onPress={() => handleCall(contact.phone)}
          >
            <View style={styles.contactInfo}>
              <MaterialIcons name={contact.icon} size={30} color="#1a73e8" />
              <View style={styles.contactText}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
            </View>
            <MaterialIcons name="phone" size={24} color="#4CAF50" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Lưu ý an toàn:</Text>
        <View style={styles.tipItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.tipText}>
            Luôn đảm bảo thông tin chuyến đi được chia sẻ với người thân
          </Text>
        </View>
        <View style={styles.tipItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.tipText}>
            Kiểm tra biển số xe và thông tin tài xế trước khi lên xe
          </Text>
        </View>
        <View style={styles.tipItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.tipText}>
            Đeo dây an toàn và tuân thủ quy tắc giao thông
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  contactsContainer: {
    padding: 15,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tipsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
}); 