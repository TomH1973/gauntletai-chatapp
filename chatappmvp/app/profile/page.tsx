import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UserProfile from "../../../components/user-profile";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserProfile />
    </div>
  );
}

