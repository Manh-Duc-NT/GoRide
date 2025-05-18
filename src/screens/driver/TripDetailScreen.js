import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TripDetailScreen({ navigation, route }) {
  const { trip } = route.params;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end - start) / (1000 * 60)); // Chuyển đổi thành phút
    if (duration < 60) {
      return `${duration} phút`;
    }
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes}p` : ''}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a73e8', '#0d47a1']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết chuyến đi</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin chuyến đi</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color="#666" />
            <Text style={styles.infoLabel}>Ngày tạo:</Text>
            <Text style={styles.infoValue}>{formatDate(trip.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="local-taxi" size={20} color="#666" />
            <Text style={styles.infoLabel}>Loại xe:</Text>
            <Text style={styles.infoValue}>{trip.serviceName}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="attach-money" size={20} color="#666" />
            <Text style={styles.infoLabel}>Giá tiền:</Text>
            <Text style={styles.infoValue}>{trip.price?.toLocaleString()}đ</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#666" />
            <Text style={styles.infoLabel}>Tên:</Text>
            <Text style={styles.infoValue}>{trip.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={20} color="#666" />
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{trip.customerPhone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin tài xế</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#666" />
            <Text style={styles.infoLabel}>Tên:</Text>
            <Text style={styles.infoValue}>{trip.driverName}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={20} color="#666" />
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{trip.driverPhone}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color="#666" />
            <Text style={styles.infoLabel}>GPLX:</Text>
            <Text style={styles.infoValue}>{trip.driverLicenseNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết hành trình</Text>
          <View style={styles.locationContainer}>
            <View style={styles.locationItem}>
              <View style={styles.locationIcon}>
                <MaterialIcons name="my-location" size={20} color="#4CAF50" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Điểm đón</Text>
                <Text style={styles.locationText}>
                  {trip.pickupLocation?.address}
                </Text>
              </View>
            </View>

            <View style={styles.locationDivider}>
              <View style={styles.dividerLine} />
              <MaterialIcons name="arrow-downward" size={20} color="#666" />
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.locationItem}>
              <View style={styles.locationIcon}>
                <MaterialIcons name="place" size={20} color="#E53935" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Điểm đến</Text>
                <Text style={styles.locationText}>
                  {trip.dropoffLocation?.address}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tripStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="straighten" size={20} color="#1a73e8" />
              <View>
                <Text style={styles.statValue}>{(trip.distance / 1000).toFixed(1)} km</Text>
                <Text style={styles.statLabel}>Khoảng cách</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <MaterialIcons name="timer" size={20} color="#4CAF50" />
              <View>
                <Text style={styles.statValue}>
                  {formatDuration(trip.startTime, trip.endTime)}
                </Text>
                <Text style={styles.statLabel}>Thời gian</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian</Text>
          <View style={styles.timelineContainer}>
            <View style={styles.timelineItem}>
              <MaterialIcons name="fiber-manual-record" size={20} color="#1a73e8" />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Tạo chuyến</Text>
                <Text style={styles.timelineTime}>{formatDate(trip.createdAt)}</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <MaterialIcons name="fiber-manual-record" size={20} color="#4CAF50" />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Nhận chuyến</Text>
                <Text style={styles.timelineTime}>{formatDate(trip.acceptedAt)}</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <MaterialIcons name="fiber-manual-record" size={20} color="#FF9800" />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Bắt đầu</Text>
                <Text style={styles.timelineTime}>{formatDate(trip.startTime)}</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <MaterialIcons name="fiber-manual-record" size={20} color="#E53935" />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Kết thúc</Text>
                <Text style={styles.timelineTime}>{formatDate(trip.endTime)}</Text>
              </View>
            </View>
          </View>
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
    padding: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  locationDivider: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 15,
    height: 40,
    marginVertical: 5,
  },
  dividerLine: {
    width: 2,
    height: 15,
    backgroundColor: '#ddd',
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  timelineContainer: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineContent: {
    marginLeft: 15,
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
  },
}); 