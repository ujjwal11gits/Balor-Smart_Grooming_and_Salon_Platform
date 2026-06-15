import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import FeedbackTab from './components/FeedbackTab';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';

import Salons from './pages/user/Salons';
import SalonDetail from './pages/user/SalonDetail';
import BookingForm from './pages/user/BookingForm';
import MyBookings from './pages/user/MyBookings';
import UserDashboard from './pages/user/Dashboard';

import AdminDashboard from './pages/admin/Dashboard';
import ShopDashboard from './pages/shop/Dashboard';
import PublicProfile from './pages/barber/PublicProfile';

function HomeRedirect() {
  const { auth } = useAuth();
  if (!auth) return <Landing />;
  if (auth.role === 'user') return <Landing />;
  if (auth.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (auth.role === 'shop') return <Navigate to="/shop/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <FeedbackTab />
      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            <Route path="/salons" element={<ProtectedRoute role="user"><Salons /></ProtectedRoute>} />
            <Route path="/salons/:id" element={<ProtectedRoute role={['user', 'shop']}><SalonDetail /></ProtectedRoute>} />
            <Route path="/barbers/:id" element={<ProtectedRoute role={['user', 'shop']}><PublicProfile /></ProtectedRoute>} />
            <Route path="/book/:barberId" element={<ProtectedRoute role="user"><BookingForm /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute role="user"><MyBookings /></ProtectedRoute>} />

            <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

            <Route path="/shop/dashboard" element={<ProtectedRoute role="shop"><ShopDashboard /></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </>
  );
}
