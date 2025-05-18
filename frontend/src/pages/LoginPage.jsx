import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase'; // Import auth từ cấu hình Firebase
import { FaSpinner, FaEnvelope, FaLock } from 'react-icons/fa'; // Thêm icon cho input

// URL ảnh nền mới - chủ đề xe cộ
const backgroundImageUrl = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // State cho thông báo lỗi
  const [loading, setLoading] = useState(false); // State cho trạng thái loading
  const navigate = useNavigate();

  // Hàm xử lý lỗi Firebase
  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Địa chỉ email không hợp lệ.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': // Mã lỗi mới cho sai email/pass
        return 'Email hoặc mật khẩu không đúng.';
      case 'auth/too-many-requests':
        return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.';
      default:
        return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Xóa lỗi cũ
    setLoading(true); // Bắt đầu loading

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Đăng nhập thành công, Firebase sẽ tự động quản lý phiên đăng nhập
      navigate('/home'); // Chuyển hướng đến trang chủ admin
    } catch (err) {
      console.error("Firebase Login Error:", err.code, err.message);
      setError(getFirebaseErrorMessage(err.code)); // Hiển thị lỗi thân thiện
    } finally {
      setLoading(false); // Kết thúc loading
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Cột ảnh nền (ẩn trên màn hình nhỏ) */}
      <div className="hidden lg:block lg:w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImageUrl})` }}>
        {/* Có thể thêm lớp phủ màu tối nhẹ nếu muốn làm nổi bật form */}
        {/* <div className="w-full h-full bg-black bg-opacity-25"></div> */}
      </div>

      {/* Cột form đăng nhập */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Tiêu đề và logo (tùy chọn) */}
          <div className="text-center">
            {/* <img src="your-logo.png" alt="GoRide Logo" className="mx-auto h-12 w-auto mb-4" /> */}
            <h2 className="text-3xl font-extrabold text-gray-900">Chào mừng Admin!</h2>
            <p className="mt-2 text-sm text-gray-600">Đăng nhập để quản lý GoRide</p>
          </div>
          
          {/* Hiển thị lỗi */}
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-100 border border-red-300 rounded-lg" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            {/* Input Email với icon */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input 
                type="email" 
                placeholder="Địa chỉ Email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                required
                disabled={loading}
              />
            </div>
            
            {/* Input Password với icon */}
            <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input 
                type="password" 
                placeholder="Mật khẩu"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                required
                disabled={loading}
              />
            </div>
            
            {/* Nút đăng nhập với màu mới */}
            <div>
              <button 
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white transition-colors duration-200 ${loading ? 'bg-sky-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500'}`}
              >
                {loading ? (
                  <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" /> 
                ) : null}
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage; 