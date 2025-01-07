import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatInterface from "../../../components/chat-interface";

export default async function ChatPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6 h-[calc(100vh-12rem)]">
      <h1 className="text-3xl font-bold">Chat</h1>
      <div className="border rounded-lg h-[calc(100%-4rem)]">
        <ChatInterface />
      </div>
    </div>
  );
}

