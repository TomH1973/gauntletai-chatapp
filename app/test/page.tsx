'use client';

import { useEffect, useState } from 'react';
import { Manager } from 'socket.io-client';

export default function TestPage() {
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const manager = new Manager('http://localhost:4000', {
      transports: ['websocket'],
    });
    const socket = manager.socket('/');

    socket.on('connect', () => {
      setConnected(true);
      addLog('Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      addLog('Disconnected from WebSocket server');
    });

    socket.on('connect_error', (error: Error) => {
      addLog(`Connection error: ${error.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">WebSocket Test Page</h1>
      
      <div className="mb-4 flex items-center">
        <div 
          className={`w-4 h-4 rounded-full mr-2 ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="border rounded p-4 bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Connection Log</h2>
        <div className="font-mono text-sm">
          {log.map((entry, i) => (
            <div key={i} className="mb-1">{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
} 