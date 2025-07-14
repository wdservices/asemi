
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
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { getUserProfile, updateUserProfile as updateMockUserProfile } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  register: (email: string, pass: string, displayName: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
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
        let profile = getUserProfile(user.uid);

        // If a profile doesn't exist (e.g., first-time Google login), create one
        if (!profile) {
            const newUserProfile: UserProfile = {
                id: user.uid,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.photoURL,
                isAdmin: false,
                enrolledCourseIds: [],
                purchasedToolIds: []
            };
            profile = updateMockUserProfile(user.uid, newUserProfile);
        }

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
    
    const newUserProfile: UserProfile = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        avatarUrl: userCredential.user.photoURL,
        isAdmin: false,
        enrolledCourseIds: [],
        purchasedToolIds: []
    };
    updateMockUserProfile(userCredential.user.uid, newUserProfile);
    setUserProfile(newUserProfile);

    return userCredential;
  };

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
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
        updateMockUserProfile(userProfile.id, data);
    }
  };


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, register, login, signInWithGoogle, logout, sendPasswordReset, updateUserProfile }}>
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
