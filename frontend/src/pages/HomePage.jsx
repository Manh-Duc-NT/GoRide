import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { db } from '../config/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { FaUsers, FaUserTie, FaUser, FaUserClock, FaSpinner, FaExclamationCircle } from 'react-icons/fa';

function StatCard({ title, value, icon: Icon, bgColor, isLoading }) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${bgColor || 'border-gray-300'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          {isLoading ? (
            <FaSpinner className="animate-spin h-6 w-6 text-gray-400 mt-2" />
          ) : (
            <p className="text-3xl font-semibold text-gray-900 mt-1">{value !== null ? value : 'N/A'}</p>
          )}
        </div>
        <div className="text-4xl text-gray-300">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const [stats, setStats] = useState({
    totalUsers: null,
    totalDrivers: null,
    totalCustomers: null,
    pendingDrivers: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersRef = collection(db, 'users');

        const totalUsersSnapshot = await getCountFromServer(usersRef);
        const totalUsers = totalUsersSnapshot.data().count;

        const driversQuery = query(usersRef, where('role', '==', 'driver'));
        const totalDriversSnapshot = await getCountFromServer(driversQuery);
        const totalDrivers = totalDriversSnapshot.data().count;

        const customersQuery = query(usersRef, where('role', '==', 'customer'));
        const totalCustomersSnapshot = await getCountFromServer(customersQuery);
        const totalCustomers = totalCustomersSnapshot.data().count;

        const pendingDriversQuery = query(usersRef, where('role', '==', 'driver'), where('verificationStatus', '==', 'pending'));
        const pendingDriversSnapshot = await getCountFromServer(pendingDriversQuery);
        const pendingDrivers = pendingDriversSnapshot.data().count;

        setStats({
          totalUsers,
          totalDrivers,
          totalCustomers,
          pendingDrivers,
        });

      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Bảng điều khiển</h1>
        
        {error && (
           <div className="flex items-center p-4 mb-6 text-sm text-red-800 bg-red-100 rounded-lg" role="alert">
             <FaExclamationCircle className="mr-2" /> {error}
           </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard 
             title="Tổng người dùng" 
             value={stats.totalUsers} 
             icon={FaUsers} 
             bgColor="border-blue-500"
             isLoading={loading}
           />
           <StatCard 
             title="Tổng tài xế" 
             value={stats.totalDrivers} 
             icon={FaUserTie} 
             bgColor="border-green-500"
             isLoading={loading}
            />
           <StatCard 
             title="Tổng khách hàng" 
             value={stats.totalCustomers} 
             icon={FaUser} 
             bgColor="border-purple-500"
             isLoading={loading}
            />
           <StatCard 
             title="Tài xế chờ duyệt" 
             value={stats.pendingDrivers} 
             icon={FaUserClock} 
             bgColor="border-yellow-500"
             isLoading={loading}
            />
        </div>
      </main>
    </div>
  );
}

export default HomePage; 