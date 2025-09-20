"use client";

import { useState, useEffect } from "react";
import { supabase, User } from "@/lib/supabase";

export default function ProfileContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    child_name: '',
    child_age: 0,
    child_condition: 'Asthma'
  });

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // For demo purposes, get the first user
        // In a real app, you'd get the current logged-in user
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('*')
          .limit(1)
          .single();

        if (userError) {
          console.error('Error fetching user:', userError);
          setMessage({ type: 'error', text: 'Failed to load profile data' });
          return;
        }

        setUser(users);
        setFormData({
          first_name: users.first_name || '',
          last_name: users.last_name || '',
          child_name: users.child_name || '',
          child_age: users.child_age || 0,
          child_condition: users.child_condition || 'Asthma'
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setMessage({ type: 'error', text: 'Failed to load profile data' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'child_age' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          child_name: formData.child_name,
          child_age: formData.child_age,
          child_condition: formData.child_condition,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user:', error);
        setMessage({ type: 'error', text: 'Failed to update profile' });
        return;
      }

      // Update local state
      const updatedUser = {
        ...user,
        first_name: formData.first_name,
        last_name: formData.last_name,
        child_name: formData.child_name,
        child_age: formData.child_age,
        child_condition: formData.child_condition,
        updated_at: new Date().toISOString()
      };
      setUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        child_name: user.child_name || '',
        child_age: user.child_age || 0,
        child_condition: user.child_condition || 'Asthma'
      });
    }
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Profile Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your account information and child's details.
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <svg className={`w-5 h-5 mr-2 ${
                message.type === 'success' ? 'text-green-500' : 'text-red-500'
              }`} fill="currentColor" viewBox="0 0 20 20">
                {message.type === 'success' ? (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                )}
              </svg>
              {message.text}
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Personal Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* First Name */}
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-900 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
                  placeholder="Enter your first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-900 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
                  placeholder="Enter your last name"
                />
              </div>

              {/* Child Name */}
              <div>
                <label htmlFor="child_name" className="block text-sm font-medium text-gray-900 mb-2">
                  Child's Name
                </label>
                <input
                  type="text"
                  id="child_name"
                  name="child_name"
                  value={formData.child_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
                  placeholder="Enter child's name"
                />
              </div>

              {/* Child Age */}
              <div>
                <label htmlFor="child_age" className="block text-sm font-medium text-gray-900 mb-2">
                  Child's Age
                </label>
                <input
                  type="number"
                  id="child_age"
                  name="child_age"
                  value={formData.child_age}
                  onChange={handleInputChange}
                  min="0"
                  max="18"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
                  placeholder="Enter child's age"
                />
              </div>

              {/* Child Condition */}
              <div className="sm:col-span-2">
                <label htmlFor="child_condition" className="block text-sm font-medium text-gray-900 mb-2">
                  Child's Condition
                </label>
                <input
                  type="text"
                  id="child_condition"
                  name="child_condition"
                  value={formData.child_condition}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
                  placeholder="Enter child's condition"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex-1 sm:flex-none bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Account Information */}
        <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Account Information</h2>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <p className="text-sm text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <p className="text-sm text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <p className="text-xs text-gray-800 font-mono">{user?.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
