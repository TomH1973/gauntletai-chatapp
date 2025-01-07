import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CreateUserForm from "../../../../components/create-user-form";

export default async function CreateUserPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Create New User</h1>
      <CreateUserForm />
    </div>
  );
}

