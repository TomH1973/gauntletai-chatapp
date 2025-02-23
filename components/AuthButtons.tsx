'use client';

import React from 'react';

export default function AuthButtons() {
  const handleClick = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="mt-8 space-y-4">
      <button 
        onClick={() => handleClick('/sign-in')}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Sign In
      </button>
      <button
        onClick={() => handleClick('/sign-up')}
        className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Create Account
      </button>
    </div>
  );
} 