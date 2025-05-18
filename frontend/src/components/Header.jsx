import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUsers, FaSignOutAlt, FaChartBar } from 'react-icons/fa'; // Icons for navigation
import { auth } from '../config/firebase'; // Import auth for logout
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/'); // Redirect to login page after logout
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally show an error message to the user
    }
  };

  const navItems = [
    { name: 'Trang chủ', path: '/home', icon: FaHome },
    { name: 'Quản lý Người dùng', path: '/users', icon: FaUsers },
    { name: 'Thống kê', path: '/statistics', icon: FaChartBar },
    // Thêm các mục điều hướng khác tại đây
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-700 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="text-xl font-semibold tracking-tight">
          <Link 
            to="/home" 
            className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200 ease-in-out"
          >
            GoRide Admin
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/home' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-200 ease-in-out ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-inner'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <item.icon aria-hidden="true" className="mr-2 h-4 w-4" /> 
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-colors duration-200 ease-in-out"
            title="Đăng xuất"
          >
            <FaSignOutAlt aria-hidden="true" className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
      {/* TODO: Add mobile menu for smaller screens if needed */}
    </header>
  );
}

export default Header; 