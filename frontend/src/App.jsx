import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import UserManagementPage from './pages/UserManagementPage';
import StatisticsPage from './pages/StatisticsPage';
import './index.css'; // Ensure Tailwind styles are imported

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/users" element={<UserManagementPage />} />
      <Route path="/statistics" element={<StatisticsPage />} />
      {/* Add other routes here */}
    </Routes>
  );
}

export default App;
