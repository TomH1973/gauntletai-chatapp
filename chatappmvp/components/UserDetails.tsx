"use client";
import { useState, useEffect } from "react";
import { fetchUserById } from "../utils/api";

type UserDetails = {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export default function UserDetails({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserById(userId)
      .then(setUser)
      .catch((err: any) => {
        console.error('Error fetching user details:', err);
        setError('Failed to load user details');
      });
  }, [userId]);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!user) return <div>Loading...</div>;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-bold mb-4">User Details</h2>
      <div className="space-y-2">
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>First Name:</strong> {user.firstName || 'N/A'}</p>
        <p><strong>Last Name:</strong> {user.lastName || 'N/A'}</p>
        <p><strong>Created At:</strong> {new Date(user.createdAt).toLocaleString()}</p>
        <p><strong>Last Login:</strong> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
  );
}

