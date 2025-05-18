import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomerTripHistory({ navigation }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalSpent: 0,
    totalDistance: 0,
    averageRating: 0
  });
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const ridesRef = collection(db, 'rides');
      const q = query(
        ridesRef,
        where('customerId', '==', user.uid),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      // Sắp xếp kết quả ở phía client
      const tripsList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return timeB - timeA;
        });

      // Tính toán thống kê
      const statistics = tripsList.reduce((acc, trip) => {
        // Chỉ tính các chuyến đã hoàn thành
        if (trip.status === 'completed') {
          acc.totalTrips += 1;
          acc.totalSpent += (trip.price || 0);
          acc.totalDistance += (trip.distance || 0);
          
          // Chỉ tính rating cho các chuyến đã được đánh giá
          if (trip.driverRating && trip.driverRating > 0) {
            acc.totalRating += trip.driverRating;
            acc.ratedTrips += 1;
          }
        }
        return acc;
      }, { 
        totalTrips: 0, 
        totalSpent: 0, 
        totalDistance: 0, 
        totalRating: 0,
        ratedTrips: 0 
      });

      // Tính trung bình đánh giá
      const averageRating = statistics.ratedTrips > 0 
        ? statistics.totalRating / statistics.ratedTrips 
        : 0;

      setStats({
        totalTrips: statistics.totalTrips,
        totalSpent: statistics.totalSpent,
        totalDistance: statistics.totalDistance,
        averageRating: averageRating
      });

      console.log('Statistics:', {
        ...statistics,
        averageRating
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
    const duration = Math.floor((end - start) / (1000 * 60));
    if (duration < 60) {
      return `${duration} phút`;
    }
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes}p` : ''}`;
  };

  const handleRateTrip = async () => {
    if (!selectedTrip || rating === 0) return;

    try {
      const tripRef = doc(db, 'rides', selectedTrip.id);
      await updateDoc(tripRef, {
        driverRating: rating,
        customerComment: comment,
        ratedAt: new Date().toISOString()
      });

      // Cập nhật state để hiển thị đánh giá mới
      setTrips(trips.map(trip => 
        trip.id === selectedTrip.id 
          ? { ...trip, driverRating: rating, customerComment: comment }
          : trip
      ));

      setIsRatingModalVisible(false);
      setSelectedTrip(null);
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error rating trip:', error);
    }
  };

  const renderRatingStars = (currentRating, onPress = null) => {
    return (
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <MaterialIcons
              name={star <= currentRating ? "star" : "star-border"}
              size={32}
              color={star <= currentRating ? "#FFC107" : "#ccc"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRatingModal = () => (
    <Modal
      visible={isRatingModalVisible}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Đánh giá chuyến đi</Text>
          
          <View style={styles.driverInfoModal}>
            <MaterialIcons name="person" size={24} color="#1a73e8" />
            <View style={styles.driverTextInfo}>
              <Text style={styles.driverNameModal}>{selectedTrip?.driverName}</Text>
              <Text style={styles.tripDateModal}>
                {formatDate(selectedTrip?.completedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Chất lượng dịch vụ</Text>
            {renderRatingStars(rating, setRating)}
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Nhận xét của bạn</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Chia sẻ trải nghiệm của bạn..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setIsRatingModalVisible(false);
                setRating(0);
                setComment('');
              }}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleRateTrip}
              disabled={rating === 0}
            >
              <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTripItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tripCard}
      onPress={() => {
        setSelectedTrip(item);
        if (!item.driverRating) {
          setIsRatingModalVisible(true);
        }
      }}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripStatus}>
          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          <Text style={styles.tripStatusText}>Hoàn thành</Text>
        </View>
        <Text style={styles.tripDate}>{formatDate(item.completedAt)}</Text>
      </View>

      <View style={styles.driverSection}>
        <MaterialIcons name="person" size={20} color="#1a73e8" />
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {item.driverName || 'Tài xế'}
          </Text>
          {item.driverPhone && (
            <Text style={styles.driverPhone}>{item.driverPhone}</Text>
          )}
        </View>
        {item.vehicle && (
          <View style={styles.vehicleInfo}>
            <MaterialIcons 
              name={item.vehicle.icon || 'motorcycle'} 
              size={20} 
              color="#666" 
            />
            <Text style={styles.vehicleName}>{item.vehicle.name || 'Xe máy'}</Text>
          </View>
        )}
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

      <View style={styles.ratingSection}>
        {item.driverRating ? (
          <View style={styles.ratedContainer}>
            {renderRatingStars(item.driverRating)}
            {item.customerComment && (
              <Text style={styles.commentText}>{item.customerComment}</Text>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => {
              setSelectedTrip(item);
              setIsRatingModalVisible(true);
            }}
          >
            <MaterialIcons name="star-border" size={20} color="#1a73e8" />
            <Text style={styles.rateButtonText}>Đánh giá chuyến đi</Text>
          </TouchableOpacity>
        )}
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
            {stats.totalSpent.toLocaleString()}đ
          </Text>
          <Text style={styles.statLabel}>Tổng chi tiêu</Text>
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
      {renderRatingModal()}
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
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  driverInfo: {
    flex: 1,
    marginLeft: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  driverPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginLeft: 10,
  },
  vehicleName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
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
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratedContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginTop: 10,
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginTop: 10,
  },
  rateButtonText: {
    fontSize: 14,
    color: '#1a73e8',
    marginLeft: 5,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  driverInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  driverTextInfo: {
    marginLeft: 10,
  },
  driverNameModal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tripDateModal: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  submitButton: {
    backgroundColor: '#1a73e8',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 