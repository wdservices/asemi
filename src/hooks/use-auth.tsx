
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { getUserProfile, updateUserProfile as updateMockUserProfile, enrollUserInCourse as enrollMock, addPurchasedToolToUser as purchaseMock } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  register: (email: string, pass: string, displayName: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // In a real app, you would fetch the user's profile from Firestore here.
        // For this demo, we'll fetch from our mock data.
        const profile = getUserProfile(user.uid);
        setUserProfile(profile || null);
        setIsAdmin(profile?.isAdmin || false);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email: string, pass: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateFirebaseProfile(userCredential.user, { displayName });
    
    // In a real app, you would create a new user document in Firestore here.
    // For this demo, we'll just refresh the auth state. The mock 'getUserProfile'
    // will need to be updated or it will return undefined for new users.
    // Let's manually create a mock profile for now.
    const newUserProfile: UserProfile = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        isAdmin: false,
        enrolledCourseIds: [],
        purchasedToolIds: []
    };
    updateMockUserProfile(userCredential.user.uid, newUserProfile); // Add to mock DB
    setUserProfile(newUserProfile); // Set in context

    return userCredential;
  };

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => {
    return signOut(auth);
  };

  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  }

  const updateUserProfile = (data: Partial<UserProfile>) => {
    if (userProfile) {
        const updatedProfile = { ...userProfile, ...data };
        setUserProfile(updatedProfile);
        // Also update the mock database
        updateMockUserProfile(userProfile.id, data);
    }
  };


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, register, login, logout, sendPasswordReset, updateUserProfile }}>
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
