import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LinearGradient } from 'expo-linear-gradient';

export default function DriverTripHistory({ navigation }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalEarnings: 0,
    totalDistance: 0,
    averageRating: 0
  });

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const ridesRef = collection(db, 'rides');
      const q = query(
        ridesRef,
        where('driverId', '==', user.uid),
        where('status', '==', 'completed'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const tripsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Tính toán thống kê
      const rawStats = tripsList.reduce((acc, trip) => {
        acc.totalTrips += 1;
        acc.totalEarnings += (trip.price || 0);
        acc.totalDistance += (trip.distance || 0);
        if (typeof trip.driverRating === 'number') {
          acc.sumOfRatings += trip.driverRating;
          acc.numberOfRatedTrips += 1;
        }
        return acc;
      }, { 
        totalTrips: 0, 
        totalEarnings: 0, 
        totalDistance: 0, 
        sumOfRatings: 0, 
        numberOfRatedTrips: 0 
      });

      const averageRating = rawStats.numberOfRatedTrips > 0 
        ? rawStats.sumOfRatings / rawStats.numberOfRatedTrips 
        : 0;

      setStats({
        totalTrips: rawStats.totalTrips,
        totalEarnings: rawStats.totalEarnings,
        totalDistance: rawStats.totalDistance,
        averageRating: averageRating
      });
      setTrips(tripsList);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
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
    if (!startTime || !endTime) return '';
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

  const renderTripItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripDetail', { trip: item })}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripStatus}>
          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          <Text style={styles.tripStatusText}>Hoàn thành</Text>
        </View>
        <Text style={styles.tripDate}>{formatDate(item.completedAt)}</Text>
      </View>

      <View style={styles.customerSection}>
        <MaterialIcons name="person" size={20} color="#1a73e8" />
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {item.customerName || 'Khách hàng'}
          </Text>
          {item.customerPhone && (
            <Text style={styles.customerPhone}>{item.customerPhone}</Text>
          )}
        </View>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.locationItem}>
          <View style={styles.locationIcon}>
            <MaterialIcons name="my-location" size={20} color="#4CAF50" />
          </View>
          <View style={styles.locationDetails}>
            <Text style={styles.locationLabel}>Điểm đón</Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {item.pickupLocation?.address || 'Không có thông tin'}
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
            <Text style={styles.locationText} numberOfLines={2}>
              {item.dropoffLocation?.address || 'Không có thông tin'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.detailItem}>
          <MaterialIcons name="straighten" size={16} color="#666" />
          <Text style={styles.detailText}>{item.distance} km</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="timer" size={16} color="#666" />
          <Text style={styles.detailText}>
            {formatDuration(item.startTime, item.completedAt)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="attach-money" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.price?.toLocaleString()}đ
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="local-taxi" size={24} color="#1a73e8" />
          <Text style={styles.statValue}>{stats.totalTrips}</Text>
          <Text style={styles.statLabel}>Tổng chuyến</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="attach-money" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>
            {stats.totalEarnings.toLocaleString()}đ
          </Text>
          <Text style={styles.statLabel}>Tổng thu nhập</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="straighten" size={24} color="#FF9800" />
          <Text style={styles.statValue}>
            {stats.totalDistance.toFixed(1)} km
          </Text>
          <Text style={styles.statLabel}>Tổng quãng đường</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="star" size={24} color="#FFC107" />
          <Text style={styles.statValue}>
            {stats.averageRating.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Đánh giá trung bình</Text>
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Lịch sử chuyến đi</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {loading && trips.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color="#ccc" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="history" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Chưa có chuyến đi nào</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1a73e8']}
            />
          }
          ListHeaderComponent={renderHeader}
        />
      )}
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
  statsContainer: {
    padding: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tripStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripStatusText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  customerInfo: {
    marginLeft: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationContainer: {
    marginBottom: 15,
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
  },
  dividerLine: {
    width: 2,
    height: 15,
    backgroundColor: '#ddd',
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
}); 