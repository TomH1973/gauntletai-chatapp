import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center">
      <SignUp />
    </div>
  );
}

