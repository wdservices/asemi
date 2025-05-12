
"use client";

import type { UserProfile } from '@/lib/types';
import { mockUsers } from '@/lib/mockData';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (userId: string) // Simulate login with a user ID from mockData
    => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Simulate initial loading state

  useEffect(() => {
    // Simulate checking for persisted login state
    const storedUserId = localStorage.getItem('mockUserId');
    if (storedUserId) {
      const foundUser = mockUsers.find(u => u.id === storedUserId);
      if (foundUser) {
        setUser(foundUser);
      }
    }
    setLoading(false);
  }, []);

  const login = (userId: string) => {
    setLoading(true);
    const foundUser = mockUsers.find(u => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('mockUserId', foundUser.id);
    } else {
      // Handle case where user ID is not found, e.g., show an error
      console.error("Mock user not found for ID:", userId);
    }
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mockUserId');
  };

  const isAdmin = !!user?.isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};