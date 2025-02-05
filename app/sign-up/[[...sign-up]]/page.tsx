import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
        </div>
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 
                "bg-blue-600 hover:bg-blue-700 text-white",
              footerActionLink: 
                "text-blue-600 hover:text-blue-500",
              card: 
                "bg-white dark:bg-gray-800 shadow-xl",
              headerTitle: 
                "text-gray-900 dark:text-white",
              dividerText: 
                "text-gray-500 dark:text-gray-400",
              formFieldLabel: 
                "text-gray-700 dark:text-gray-300",
              identityPreviewText: 
                "text-gray-700 dark:text-gray-300",
            },
          }}
          routing="path"
          path="/sign-up"
          afterSignUpUrl="/chat"
          signInUrl="/sign-in"
          redirectUrl="/chat"
        />
      </div>
    </div>
  );
} 