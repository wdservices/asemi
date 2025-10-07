
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
  login: (email: string, pass: string) => Promise<{ isAdmin: boolean }>;
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isAdminUser = firebaseUser.email === 'hello.wdservices@gmail.com';
        let profile = await getUserProfile(firebaseUser.uid);

        if (!profile) {
            const newUserProfileData: UserProfile = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                avatarUrl: firebaseUser.photoURL || null,
                isAdmin: isAdminUser,
                enrolledCourses: [],
                purchasedToolIds: []
            };
            profile = await updateDbUserProfile(firebaseUser.uid, newUserProfileData) || null;
        } else if (profile.isAdmin !== isAdminUser) {
            profile = await updateDbUserProfile(firebaseUser.uid, { ...profile, isAdmin: isAdminUser }) || null;
        }

        // Create extended user object with profile
        const userWithProfile = {
          ...firebaseUser,
          userProfile: profile,
          isAdmin: profile?.isAdmin || false
        } as User;

        setUser(userWithProfile);
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
        avatarUrl: userCredential.user.photoURL || null,
        isAdmin: userCredential.user.email === 'hello.wdservices@gmail.com',
        enrolledCourses: [],
        purchasedToolIds: []
    };
    const createdProfile = await updateDbUserProfile(userCredential.user.uid, newUserProfile);
    
    if (createdProfile) {
      const userWithProfile = {
        ...userCredential.user,
        userProfile: createdProfile,
        isAdmin: createdProfile.isAdmin || false
      } as User;
      
      setUser(userWithProfile);
      setUserProfile(createdProfile);
      setIsAdmin(createdProfile.isAdmin || false);
    }

    return userCredential;
  };

  const login = async (email: string, pass: string) => {
    try {
      // Trim whitespace and validate inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = pass.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        throw new Error('Email and password are required');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      // After successful sign-in, onAuthStateChanged will trigger.
      // However, to ensure the redirect logic gets the latest admin status immediately,
      // we can fetch the profile here and return the status.
      const profile = await getUserProfile(userCredential.user.uid);
      return { isAdmin: profile?.isAdmin || false };
    } catch (error: any) {
      console.error('Login error details:', error);
      
      // Enhance error messages for better user experience
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      // Re-throw the original error if it's not a Firebase auth error
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user || !userProfile) return;
    
    const updatedProfile: UserProfile = {
      ...userProfile,
      ...data,
      id: user.uid, // Ensure ID is always set
      email: user.email,
      displayName: user.displayName
    };
    
    await updateDbUserProfile(user.uid, updatedProfile);
    
    // Update both user and userProfile states
    const updatedUser = {
      ...user,
      userProfile: updatedProfile,
      isAdmin: updatedProfile.isAdmin || false
    } as User;
    
    setUser(updatedUser);
    setUserProfile(updatedProfile);
    setIsAdmin(updatedProfile.isAdmin || false);
    
    return updatedProfile;
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
