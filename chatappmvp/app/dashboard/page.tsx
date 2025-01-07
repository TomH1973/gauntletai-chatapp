import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold text-gray-700 mb-4">Welcome to your dashboard!</p>
        <Button asChild>
          <Link href="/chat">Go to Chat</Link>
        </Button>
      </div>
    </div>
  );
}

