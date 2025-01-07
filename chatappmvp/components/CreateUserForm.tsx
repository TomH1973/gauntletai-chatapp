"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUser } from "@/utils/api";

export default function CreateUserForm() {
  const [formData, setFormData] = useState({
    clerkId: '',
    email: '',
    username: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      await createUser(formData);
      setSuccess(true);
      setFormData({ clerkId: '', email: '', username: '', firstName: '', lastName: '' });
    } catch (err) {
      setError('Failed to create user. Please try again.');
      console.error('Error creating user:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto mt-8">
      <Input
        name="clerkId"
        value={formData.clerkId}
        onChange={handleChange}
        placeholder="Clerk ID"
        required
      />
      <Input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
        required
      />
      <Input
        name="username"
        value={formData.username}
        onChange={handleChange}
        placeholder="Username"
      />
      <Input
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
        placeholder="First Name"
      />
      <Input
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
        placeholder="Last Name"
      />
      <Button type="submit">Create User</Button>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">User created successfully!</p>}
    </form>
  );
}

