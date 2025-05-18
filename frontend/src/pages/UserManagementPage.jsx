import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css'; // Import default styles
import { FaSpinner, FaExclamationCircle, FaUserTie, FaUser, FaUserShield } from 'react-icons/fa'; // Icons
// Import react-toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Import Modal và UserDetailsModal
import Modal from 'react-modal';
import UserDetailsModal from '../components/UserDetailsModal';

// Set App Element for react-modal (lý tưởng là làm ở main.jsx hoặc App.jsx)
Modal.setAppElement('#root'); 

// Helper function to format Firestore Timestamp or ISO String
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    // Attempt to create a date object
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    // Format valid date
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Error'; // Indicate an error occurred during formatting
  }
};

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabIndex, setTabIndex] = useState(0); // 0: Customer, 1: Driver, 2: Admin
  const [updatingUserId, setUpdatingUserId] = useState(null); // State cho biết user nào đang được update
  // State cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, orderBy('createdAt', 'desc')); // Sắp xếp theo ngày tạo mới nhất
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (err) {
        console.error("Error fetching users: ", err);
        setError("Không thể tải danh sách người dùng. Vui lòng thử lại.");
        toast.error("Không thể tải danh sách người dùng."); // Thêm toast lỗi
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filterUsersByRole = (role) => {
    return users.filter(user => user.role === role);
  };

  // Placeholder handlers for actions
  const handleViewDetails = (userId) => {
    const userToView = users.find(user => user.id === userId);
    if (userToView) {
      setSelectedUser(userToView);
      setIsModalOpen(true);
    } else {
      toast.error("Không tìm thấy thông tin người dùng.");
    }
  };

  const handleApproveDriver = async (userId) => {
    setUpdatingUserId(userId); // Đánh dấu user này đang được cập nhật
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        verificationStatus: 'approved' 
      });

      // Cập nhật state cục bộ để UI thay đổi ngay lập tức
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, verificationStatus: 'approved' } : user
        )
      );
      
      toast.success('Đã phê duyệt tài xế thành công!'); // Sử dụng toast.success

    } catch (err) {
      console.error("Error approving driver: ", err);
      toast.error('Có lỗi xảy ra khi phê duyệt tài xế.'); // Sử dụng toast.error
    } finally {
      setUpdatingUserId(null); // Hoàn tất cập nhật
    }
  };

  const handleBlockDriver = async (userId) => {
    setUpdatingUserId(userId);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { isBlocked: true });
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, isBlocked: true } : user
        )
      );
      toast.success('Đã chặn tài xế thành công!');
    } catch (err) {
      console.error("Error blocking driver: ", err);
      toast.error('Có lỗi xảy ra khi chặn tài xế.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUnblockDriver = async (userId) => {
    setUpdatingUserId(userId);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { isBlocked: false }); // Set isBlocked thành false
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, isBlocked: false } : user
        )
      );
      toast.success('Đã bỏ chặn tài xế thành công!');
    } catch (err) {
      console.error("Error unblocking driver: ", err);
      toast.error('Có lỗi xảy ra khi bỏ chặn tài xế.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleEditUser = (userId) => {
    console.log("Edit user:", userId);
     toast.info('Chức năng Sửa chưa được triển khai.');
  }

  const handleDeleteUser = (userId) => {
    console.log("Delete user:", userId);
     toast.info('Chức năng Xóa chưa được triển khai.');
  }

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  }

  const renderUserTable = (filteredUsers, role) => {
    if (filteredUsers.length === 0) {
      return <p className="text-gray-500 italic mt-4">Không có người dùng nào trong mục này.</p>;
    }

    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full divide-y divide-gray-200 shadow border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hiển thị</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số điện thoại</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => {
              const isUpdating = updatingUserId === user.id; // Kiểm tra user này có đang update không
              return (
                <tr key={user.id} className={`hover:bg-gray-50 ${isUpdating ? 'opacity-70' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.displayName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phoneNumber || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.isBlocked ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Đã chặn</span>
                    ) : user.verificationStatus === 'approved' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Đã duyệt</span>
                    ) : user.verificationStatus === 'pending' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Chờ duyệt</span>
                    ) : (
                      <span className="text-gray-500">Không áp dụng</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleViewDetails(user.id)} 
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors duration-150" 
                        disabled={isUpdating} 
                        title="Xem chi tiết"
                      >
                        Xem
                      </button>

                      {role === 'driver' && (
                        <>
                          {user.verificationStatus === 'pending' && (
                            <button 
                              onClick={() => handleApproveDriver(user.id)} 
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center px-2 py-1 rounded hover:bg-green-100 transition-colors duration-150"
                              disabled={isUpdating}
                              title="Phê duyệt"
                            >
                               {isUpdating ? <FaSpinner className="animate-spin mr-1"/> : null} 
                               Phê duyệt
                             </button>
                          )}
                          {user.verificationStatus !== 'pending' && !user.isBlocked && (
                             <button onClick={() => handleBlockDriver(user.id)} className="text-red-600 hover:text-red-900 disabled:opacity-50 px-2 py-1 rounded hover:bg-red-100 transition-colors duration-150" disabled={isUpdating} title="Chặn">Chặn</button>
                          )}
                           {user.verificationStatus !== 'pending' && user.isBlocked === true && (
                             <button onClick={() => handleUnblockDriver(user.id)} className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 px-2 py-1 rounded hover:bg-yellow-100 transition-colors duration-150" disabled={isUpdating} title="Bỏ chặn">Bỏ chặn</button>
                          )}
                        </>
                      )}

                      {/* Chỉ hiển thị Sửa/Xóa cho admin */}
                      {role === 'admin' && (
                        <>
                          <button onClick={() => handleEditUser(user.id)} className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 px-2 py-1 rounded hover:bg-yellow-100 transition-colors duration-150" disabled={isUpdating} title="Sửa">Sửa</button>
                          <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 disabled:opacity-50 px-2 py-1 rounded hover:bg-red-100 transition-colors duration-150" disabled={isUpdating} title="Xóa">Xóa</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="colored" // hoặc "light", "dark"
      />
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Quản lý Người dùng</h1>
        
        {loading && (
          <div className="flex justify-center items-center py-10">
            <FaSpinner className="animate-spin h-8 w-8 text-indigo-600" />
            <span className="ml-3 text-gray-600">Đang tải dữ liệu người dùng...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-lg hidden" role="alert">
            <FaExclamationCircle className="mr-2" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)}>
              <TabList className="flex border-b border-gray-200">
                {/* Custom Tab Styling */}
                <Tab className={`flex items-center px-4 py-2 cursor-pointer font-medium border-b-2 transition-colors duration-150 ease-in-out ${tabIndex === 0 ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> 
                  <FaUser className="mr-2" /> Khách hàng
                </Tab>
                <Tab className={`flex items-center px-4 py-2 cursor-pointer font-medium border-b-2 transition-colors duration-150 ease-in-out ${tabIndex === 1 ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  <FaUserTie className="mr-2" /> Tài xế
                </Tab>
                <Tab className={`flex items-center px-4 py-2 cursor-pointer font-medium border-b-2 transition-colors duration-150 ease-in-out ${tabIndex === 2 ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                   <FaUserShield className="mr-2" /> Quản trị viên
                </Tab>
              </TabList>

              <TabPanel>
                {renderUserTable(filterUsersByRole('customer'), 'customer')}
              </TabPanel>
              <TabPanel>
                {renderUserTable(filterUsersByRole('driver'), 'driver')}
              </TabPanel>
              <TabPanel>
                {renderUserTable(filterUsersByRole('admin'), 'admin')}
              </TabPanel>
            </Tabs>
          </div>
        )}
      </main>
      
      {/* Render Modal */}
      {selectedUser && (
        <UserDetailsModal 
          isOpen={isModalOpen} 
          onRequestClose={closeModal} 
          user={selectedUser} 
        />
      )}
    </div>
  );
}

export default UserManagementPage; 