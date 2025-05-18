import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserProfile, updateUserProfile } from '../services/auth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setUser({ ...firebaseUser, ...userProfile });
          } else {
            // Nếu không tìm thấy profile, đăng xuất user
            await firebaseSignOut(auth);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleUpdateUserProfile = async (userId, updates) => {
    try {
      const updatedProfile = await updateUserProfile(userId, updates);
      if (updatedProfile) {
        setUser(prev => ({
          ...prev,
          ...updatedProfile
        }));
        return updatedProfile;
      }
      throw new Error('Không thể cập nhật thông tin người dùng');
    } catch (error) {
      console.error('Error in handleUpdateUserProfile:', error);
      throw error;
    }
  };

  const updateUserAddresses = async (userId, updates) => {
    try {
      const updatedProfile = await updateUserProfile(userId, updates);
      if (updatedProfile) {
        setUser(prev => ({
          ...prev,
          ...updatedProfile
        }));
        return updatedProfile;
      }
      throw new Error('Không thể cập nhật thông tin người dùng');
    } catch (error) {
      console.error('Error in updateUserAddresses:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    updateUserAddresses,
    updateUserProfile: handleUpdateUserProfile,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 