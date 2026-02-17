import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/pages/Login';
import Signup from './components/pages/Signup';
import PatientDashboard from './components/pages/PatientDashboard';
import CaretakerDashboard from './components/pages/CaretakerDashboard';
import './assets/style/index.css';

type UserRole = 'patient' | 'caretaker' | 'both';

// Mock auth state - replace with actual auth logic
const isAuthenticated: boolean = true;
const userRole: UserRole = 'both';

function App() {
  const getDashboardRoute = (): string => {
    if (userRole === 'patient') return '/patient';
    if (userRole === 'caretaker') return '/caretaker';
    return '/patient';
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route
          path="/patient"
          element={
            isAuthenticated ? (
              <PatientDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/caretaker"
          element={
            isAuthenticated ? (
              <CaretakerDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={getDashboardRoute()} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;