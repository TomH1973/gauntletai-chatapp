'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function ThreadTestPage() {
  const { userId, getToken } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
        const response = await fetch('/api/test', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setAuthStatus(`Authenticated as ${data.userId}`);
        addLog(`Auth check: ${JSON.stringify(data, null, 2)}`);
      } catch (error: any) {
        setAuthStatus('Not authenticated');
        addLog(`Auth error: ${error?.message || 'Unknown error'}`);
      }
    };

    checkAuth();
  }, [getToken]);

  const testThreadCreation = async () => {
    try {
      const token = await getToken();
      
      // Test without auth
      try {
        const noAuthResponse = await fetch('/api/threads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Thread',
            participantIds: []
          })
        });
        const noAuthData = await noAuthResponse.json();
        addLog(`No auth test: ${noAuthResponse.status} ${noAuthResponse.statusText}`);
        addLog(`Response: ${JSON.stringify(noAuthData, null, 2)}`);
      } catch (error: any) {
        addLog(`No auth test error: ${error?.message || 'Unknown error'}`);
      }

      // Test with auth
      const response = await fetch('/api/threads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Test Thread',
          participantIds: []
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      addLog(`Auth test: ${response.status} ${response.statusText}`);
      addLog(`Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      setError(message);
      addLog(`Error: ${message}`);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Thread Creation Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        <div>{authStatus}</div>
      </div>

      <div className="mb-4">
        <button
          onClick={testThreadCreation}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={!userId}
        >
          Test Thread Creation
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="border rounded p-4 bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Test Log</h2>
        <div className="font-mono text-sm">
          {log.map((entry, i) => (
            <div key={i} className="mb-1">{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
} 