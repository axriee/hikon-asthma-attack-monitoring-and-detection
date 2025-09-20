"use client";

import { useState, useEffect } from "react";
import { supabase, User } from "@/lib/supabase";

interface UserSelectorProps {
  onUserSelect: (user: User) => void;
  currentUser: User | null;
  onSetActive?: (userId: string) => void;
}

export default function UserSelector({ onUserSelect, currentUser, onSetActive }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      console.log('Fetching users from database...');
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('first_name');

        if (error) {
          console.error('Error fetching users:', error);
        } else {
          console.log('Users fetched successfully:', data?.length || 0, 'users');
          setUsers(data || []);
          // Find the active user
          const activeUser = data?.find(user => user.active);
          if (activeUser) {
            console.log('Found active user:', activeUser.first_name, activeUser.last_name);
            setActiveUserId(activeUser.id);
          } else {
            console.log('No active user found');
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSetActive = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('set_active_user', { user_id: userId });
      
      if (error) {
        console.error('Error setting active user:', error);
        alert('Error setting active user');
      } else {
        setActiveUserId(userId);
        if (onSetActive) {
          onSetActive(userId);
        }
        alert('Active user updated! ESP32 will now send data to this user.');
      }
    } catch (error) {
      console.error('Error setting active user:', error);
      alert('Error setting active user');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <p className="text-gray-500 text-sm">No users found in database</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-800">Patient Management</h3>
        {activeUserId && (
          <div className="flex items-center text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>ESP32 Active</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Patient to Monitor:
          </label>
          <select
            value={currentUser?.id || ''}
            onChange={(e) => {
              const selectedUser = users.find(user => user.id === e.target.value);
              if (selectedUser) {
                onUserSelect(selectedUser);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
          >
            <option value="">Choose a patient...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} - {user.child_name} ({user.child_age} years old)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Set Active User for ESP32:
          </label>
          <div className="grid grid-cols-1 gap-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${user.id === activeUserId ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name} - {user.child_name}
                    </p>
                    <p className="text-xs text-gray-500">{user.child_age} years old</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSetActive(user.id)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    user.id === activeUserId
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  {user.id === activeUserId ? 'Active' : 'Set Active'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {currentUser && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">👤 Parent:</span> {currentUser.first_name} {currentUser.last_name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">👶 Child:</span> {currentUser.child_name} ({currentUser.child_age} years old)
            </p>
            {currentUser.id === activeUserId && (
              <p className="text-sm text-green-600 font-medium mt-1">
                📡 ESP32 is sending data to this user
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
