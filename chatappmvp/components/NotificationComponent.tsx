"use client";

import { useState, useEffect } from "react";
import { Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchWithAuth } from "@/utils/api";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/components/ui/use-toast";

type Notification = {
  id: string;
  message: {
    content: string;
    user: {
      username: string;
    };
  };
  createdAt: string;
};

export function NotificationComponent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const socket = useSocket();
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_notification', (notification: Notification) => {
        setNotifications(prevNotifications => [notification, ...prevNotifications]);
        toast({
          title: "New Message",
          description: `${notification.message.user.username} sent a new message`,
        });
      });
    }
  }, [socket, toast]);

  const fetchNotifications = async () => {
    try {
      const response = await fetchWithAuth('/api/notifications');
      setNotifications(response);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetchWithAuth('/api/notifications', 'PUT', { notificationId });
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h3 className="font-medium mb-2">Notifications</h3>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No new notifications</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="mb-4 p-2 bg-gray-100 rounded">
                <p className="text-sm">
                  <strong>{notification.message.user.username}</strong> sent a message:
                </p>
                <p className="text-sm text-gray-600">{notification.message.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notification.id)}
                  className="mt-2"
                >
                  Mark as read
                </Button>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

