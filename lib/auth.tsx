"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, User } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  childName: string;
  childAge: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple login function - just find user by email
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // For demo purposes, we'll just find the user by email
      // In a real app, you'd verify the password hash
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (users && users.length > 0) {
        setUser(users[0]);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Simple signup function - creates user in database
  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .limit(1);

      if (checkError) {
        console.error('Error checking existing user:', checkError);
        return false;
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log('User already exists with this email');
        return false;
      }

      // Create new user (for demo, we'll use a simple password hash)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash: `$2a$10$demo_hash_${Date.now()}`, // Demo hash
          first_name: userData.firstName,
          last_name: userData.lastName,
          child_name: userData.childName,
          child_age: userData.childAge,
          child_condition: 'Asthma', // Default condition
          active: false // New users start as inactive
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return false;
      }

      if (newUser) {
        setUser(newUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('breathcare_user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('breathcare_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('breathcare_user');
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
