import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AuthButtons from '../components/AuthButtons';

export default async function HomePage() {
  const { userId } = await auth();
  
  if (userId) {
    redirect('/chat');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Chat App
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to start chatting
          </p>
        </div>
        <AuthButtons />
      </div>
    </div>
  );
} 