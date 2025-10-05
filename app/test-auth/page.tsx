"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestAuthPage() {
  const [role, setRole] = useState('HOD');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleTestLogin = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          password,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Store token in localStorage for testing
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.role);
        document.cookie = `authToken=${data.token}; path=/; max-age=86400; SameSite=strict`;
      }
    } catch (error) {
      setResult({ error: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestToken = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setResult({ error: 'No token found in localStorage' });
      return;
    }

    try {
      const response = await fetch('/api/admin/students', {
        headers: {
          'Cookie': `authToken=${token}`
        }
      });

      const data = await response.json();
      setResult({ tokenTest: data });
    } catch (error) {
      setResult({ error: 'Token test failed' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Login Test</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="HOD">HOD</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter password"
                />
              </div>
              
              <button
                onClick={handleTestLogin}
                disabled={isLoading}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test Login'}
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Token Test</h2>
            
            <div className="space-y-4">
              <button
                onClick={handleTestToken}
                className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
              >
                Test Token Access
              </button>
              
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('userRole');
                  document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                  setResult(null);
                }}
                className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Clear Auth Data
              </button>
            </div>
          </div>
        </div>
        
        {result && (
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-black text-green-400 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-8">
          <button
            onClick={() => router.push('/login')}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    </div>
  );
}