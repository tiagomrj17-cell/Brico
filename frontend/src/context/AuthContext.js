import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [staff, setStaff] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('staff_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/staff/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStaff(response.data);
        } catch (error) {
          console.error('Token inválido:', error);
          localStorage.removeItem('staff_token');
          setToken(null);
          setStaff(null);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/staff/login`, {
        username,
        password
      });
      
      const { token: newToken, staff: staffData } = response.data;
      localStorage.setItem('staff_token', newToken);
      setToken(newToken);
      setStaff(staffData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erro ao fazer login' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('staff_token');
    setToken(null);
    setStaff(null);
  };

  const value = {
    staff,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!staff
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};