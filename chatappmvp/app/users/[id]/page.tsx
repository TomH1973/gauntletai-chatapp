import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UserDetails from "../../../../components/user-details";

export default async function UserDetailsPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserDetails userId={params.id} />
    </div>
  );
}

