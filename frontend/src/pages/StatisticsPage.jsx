import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { db } from '../config/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { FaUsers, FaCar, FaMoneyBillWave, FaRoute, FaStar } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  scales,
  Ticks
} from 'chart.js';
import { number } from 'yup';

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function StatisticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    totalRides: 0,
    totalRevenue: 0,
    averageRating: 0,
    recentRides: [],
    monthlyStats: {
      labels: [],
      revenues: [],
      rides: []
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Fetch users statistics
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const totalUsers = users.filter(user => user.role === 'customer').length;
      const totalDrivers = users.filter(user => user.role === 'driver').length;

      // Fetch rides statistics
      const ridesQuery = query(collection(db, 'rides'));
      const ridesSnapshot = await getDocs(ridesQuery);
      const rides = ridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const completedRides = rides.filter(ride => ride.status === 'completed');
      const totalRides = completedRides.length;
      const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.price || 0), 0);

      // Calculate average rating
      const ratedRides = completedRides.filter(ride => ride.driverRating);
      const averageRating = ratedRides.length > 0
        ? ratedRides.reduce((sum, ride) => sum + ride.driverRating, 0) / ratedRides.length
        : 0;

      // Calculate monthly statistics for the last 6 months
      const monthlyStats = calculateMonthlyStats(completedRides);

      setStats({
        totalUsers,
        totalDrivers,
        totalRides,
        totalRevenue,
        averageRating,
        recentRides: completedRides.slice(0, 5), // Get 5 most recent rides
        monthlyStats
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (rides) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
    }).reverse();

    const monthlyData = last6Months.map(monthYear => {
      const [month, year] = monthYear.split(' ');
      const monthRides = rides.filter(ride => {
        const rideDate = new Date(ride.completedAt || ride.endTime);
        return rideDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' }) === monthYear;
      });

      return {
        revenue: monthRides.reduce((sum, ride) => sum + (ride.price || 0), 0),
        rides: monthRides.length
      };
    });

    return {
      labels: last6Months,
      revenues: monthlyData.map(data => data.revenue),
      rides: monthlyData.map(data => data.rides)
    };
  };

  const revenueChartData = {
    labels: stats.monthlyStats.labels,
    datasets: [
      {
        label: 'Doanh thu (VNĐ)',
        data: stats.monthlyStats.revenues,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const ridesChartData = {
    labels: stats.monthlyStats.labels,
    datasets: [
      {
        label: 'Số chuyến đi',
        data: stats.monthlyStats.rides,
        borderColor: 'rgb(153, 102, 255)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Thống kê theo tháng'
      }
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color} text-white mr-4`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Thống kê tổng quan</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8 text-gray-800">
          <StatCard
            title="Tổng người dùng"
            value={stats.totalUsers}
            icon={FaUsers}
            color="bg-blue-500"
          />

          <StatCard
            title="Tổng tài xế"
            value={stats.totalDrivers}
            icon={FaCar}
            color="bg-green-500"
          />
          <StatCard
            title="Tổng chuyến đi"
            value={stats.totalRides}
            icon={FaRoute}
            color="bg-purple-500"
          />
          <StatCard
            title="Tổng doanh thu"
            value={`${(stats.totalRevenue).toLocaleString()}đ`}
            icon={FaMoneyBillWave}
            color="bg-yellow-500"
          />
          <StatCard
            title="Đánh giá trung bình"
            value={stats.averageRating.toFixed(1)}
            icon={FaStar}
            color="bg-red-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Biểu đồ doanh thu</h2>
            <Line data={revenueChartData} options={chartOptions} />
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Biểu đồ chuyến đi</h2>
            <Line data={ridesChartData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Rides Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-semibold p-6 border-b">Chuyến đi gần đây</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Tài xế</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Giá tiền</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentRides.map((ride) => (
                  <tr key={ride.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ride.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ride.customerName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ride.driverName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ride.price?.toLocaleString()}đ</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ride.driverRating ? (
                        <div className="flex items-center">
                          <FaStar className="text-yellow-400 mr-1" />
                          <span>{ride.driverRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        'Chưa đánh giá'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StatisticsPage; 