import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 
                "bg-blue-600 hover:bg-blue-700 text-white",
              footerActionLink: 
                "text-blue-600 hover:text-blue-500",
            },
          }}
          routing="path"
          path="/sign-in"
          afterSignInUrl="/chat"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
} 