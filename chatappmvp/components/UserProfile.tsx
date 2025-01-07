"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchWithAuth, updateUserProfile } from "@/utils/api";

type UserProfile = {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
};

export default function UserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/users')
      .then(setProfile)
      .catch(console.error);
  }, []);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedData = {
      username: formData.get('username') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
    };

    try {
      const updatedProfile = await updateUserProfile(updatedData);
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input name="username" defaultValue={profile.username} placeholder="Username" />
          <Input name="firstName" defaultValue={profile.firstName || ''} placeholder="First Name" />
          <Input name="lastName" defaultValue={profile.lastName || ''} placeholder="Last Name" />
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
        </form>
      ) : (
        <div className="space-y-2">
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>First Name:</strong> {profile.firstName || 'N/A'}</p>
          <p><strong>Last Name:</strong> {profile.lastName || 'N/A'}</p>
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        </div>
      )}
    </div>
  );
}

