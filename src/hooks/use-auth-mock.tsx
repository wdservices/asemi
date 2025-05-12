
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
  // Expose setUser and setLoading for direct manipulation in mock scenarios (like registration)
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  // Expose function to update the current user state after a mock purchase
  updateUser: (updatedUserData: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Simulate initial loading state

  useEffect(() => {
    // Simulate checking for persisted login state
    const storedUserId = localStorage.getItem('mockUserId');
    if (storedUserId) {
      // Check if it's a temporary user ID from a previous registration mock
      if (storedUserId.startsWith('temp-')) {
         // Attempt to reconstruct the temporary user if needed, or just clear it
         // For simplicity, we'll clear temporary users on refresh
         localStorage.removeItem('mockUserId');
      } else {
          const foundUser = mockUsers.find(u => u.id === storedUserId);
          if (foundUser) {
            setUser(foundUser);
          } else {
            // Clear invalid stored ID
            localStorage.removeItem('mockUserId');
          }
      }
    }
    setLoading(false);
  }, []);

  const login = (userId: string) => {
    setLoading(true);
    // IMPORTANT: Find user from the potentially modified mockUsers array
    const foundUser = mockUsers.find(u => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('mockUserId', foundUser.id);
    } else {
      // Handle case where user ID is not found, e.g., show an error
      console.error("Mock user not found for ID:", userId);
       localStorage.removeItem('mockUserId'); // Clear potentially invalid ID
       setUser(null); // Ensure user is logged out if not found
    }
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mockUserId');
  };

  // Function to update the user state in the context directly
  // Needed for mock purchase/enrollment updates
  const updateUser = (updatedUserData: Partial<UserProfile>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      // Update the corresponding user in mockUsers array as well
      const userIndex = mockUsers.findIndex(u => u.id === prevUser.id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...updatedUserData };
      }
      // Return the updated state for the context
      return { ...prevUser, ...updatedUserData };
    });
  };


  const isAdmin = !!user?.isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, setUser, setLoading, updateUser }}>
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
