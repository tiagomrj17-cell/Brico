import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import PublicOrderPage from '@/pages/PublicOrderPage';
import StaffLogin from '@/pages/StaffLogin';
import StaffDashboard from '@/pages/StaffDashboard';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicOrderPage />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route 
              path="/staff/dashboard" 
              element={
                <ProtectedRoute>
                  <StaffDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </AuthProvider>
  );
}

export default App;