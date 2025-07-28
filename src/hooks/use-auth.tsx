
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
import { getUserProfile, updateUserProfile as updateDbUserProfile } from '@/lib/mockData';

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
        
        const isAdminUser = user.email === 'hello.wdservices@gmail.com';
        let profile = await getUserProfile(user.uid);

        if (!profile) {
            const newUserProfileData: UserProfile = {
                id: user.uid,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.photoURL,
                isAdmin: isAdminUser,
                enrolledCourseIds: [],
                purchasedToolIds: []
            };
            profile = await updateDbUserProfile(user.uid, newUserProfileData);
        } else if (profile.isAdmin !== isAdminUser) {
            profile = await updateDbUserProfile(user.uid, { isAdmin: isAdminUser });
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
        isAdmin: userCredential.user.email === 'hello.wdservices@gmail.com',
        enrolledCourseIds: [],
        purchasedToolIds: []
    };
    const createdProfile = await updateDbUserProfile(userCredential.user.uid, newUserProfile);
    setUserProfile(createdProfile || null);

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

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (userProfile) {
        const updatedProfile = await updateDbUserProfile(userProfile.id, data);
        if(updatedProfile) {
            setUserProfile(updatedProfile);
        }
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
