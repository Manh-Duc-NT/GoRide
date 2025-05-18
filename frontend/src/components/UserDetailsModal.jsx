import React from 'react';
import Modal from 'react-modal';
import { FaTimes, FaUserCircle, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaIdCard, FaCar, FaUser, FaUserShield } from 'react-icons/fa';

// Helper function to format dates (reuse from UserManagementPage or define here)
const formatDate = (dateString) => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Ngày không hợp lệ';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (error) { return 'Lỗi định dạng'; }
};

// Custom styles for the modal (optional, can use default or Tailwind)
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px', // Max width for the modal
    width: '90%',      // Responsive width
    padding: '0',      // Remove default padding, handle with internal divs
    maxHeight: '85vh', // Limit modal height
    overflow: 'hidden', // Prevent content overflow issues
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
    zIndex: 1000,
  },
};

// Bind modal to your appElement (important for accessibility)
// Do this once in your main app file (e.g., main.jsx or App.jsx) if possible
// Modal.setAppElement('#root'); // Example, adjust selector if needed

function UserDetailsModal({ isOpen, onRequestClose, user }) {
  if (!user) return null; // Don't render if no user is selected

  // Function to render a detail item consistently
  const renderDetailItem = (Icon, label, value) => (
    <div className="flex items-start py-3 border-b border-gray-100 last:border-b-0">
      <Icon className="h-5 w-5 text-indigo-500 mr-4 mt-1 flex-shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-sm text-gray-900 break-words">
          {value || <span className="text-gray-400 italic">Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );

  // Function to render image links safely
  const renderImageLink = (label, url) => (
    <div className="flex items-start py-3 border-b border-gray-100 last:border-b-0">
      <FaIdCard className="h-5 w-5 text-indigo-500 mr-4 mt-1 flex-shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {url ? (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mt-1 text-sm text-indigo-600 hover:text-indigo-800 underline break-all"
          >
            Xem ảnh
          </a>
        ) : (
          <p className="mt-1 text-sm text-gray-400 italic">Chưa tải lên</p>
        )}
      </div>
    </div>
  );


  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={customStyles}
      contentLabel="Chi tiết người dùng"
      ariaHideApp={false} // Only set to false if you CANNOT set appElement
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <h2 className="text-xl font-semibold flex items-center">
            <FaUserCircle className="mr-2" /> Chi tiết Người dùng
          </h2>
          <button 
            onClick={onRequestClose} 
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Đóng"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body with Scroll */}
        <div className="p-6 overflow-y-auto flex-grow">
          {renderDetailItem(FaUserCircle, "Tên hiển thị", user.displayName)}
          {renderDetailItem(FaEnvelope, "Email", user.email)}
          {renderDetailItem(FaPhone, "Số điện thoại", user.phoneNumber)}
          {renderDetailItem(FaUser, "Giới tính", user.gender)}
          {renderDetailItem(FaCalendarAlt, "Ngày sinh", user.dateOfBirth)} 
          {renderDetailItem(FaMapMarkerAlt, "Địa chỉ nhà", user.homeAddress)}
          {renderDetailItem(FaMapMarkerAlt, "Địa chỉ làm việc", user.workAddress)}
          {renderDetailItem(FaCalendarAlt, "Ngày tạo", formatDate(user.createdAt))}
          {renderDetailItem(FaCalendarAlt, "Cập nhật lần cuối", formatDate(user.updatedAt))}
          {renderDetailItem(FaUserShield, "Vai trò", user.role)}
          {user.role === 'driver' && (
            <>
              <hr className="my-2"/>
              <p className="text-sm font-semibold text-gray-600 mt-4 mb-2">Thông tin tài xế:</p>
              {renderDetailItem(FaIdCard, "Trạng thái xác thực", user.verificationStatus)}
              {renderDetailItem(FaCar, "Trạng thái chặn", user.isBlocked ? "Đã chặn" : "Không chặn")}
              {/* Display driver documents if available */}
              {user.documents && user.documents.idCard && renderImageLink("CCCD/CMND", user.documents.idCard)}
              {user.documents && user.documents.driverLicense && renderImageLink("Giấy phép lái xe", user.documents.driverLicense)}
            </>
          )}

          {/* Add more fields as needed */}
        </div>
        
        {/* Footer (Optional) */}
        <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end border-t border-gray-200">
           <button
            onClick={onRequestClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default UserDetailsModal; 