'use client';

import { usePreferences } from '@/hooks/usePreferences';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UserPreferences() {
  const { preferences, isLoading, error, updatePreferences } = usePreferences();

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!preferences) {
    return <div>No preferences found</div>;
  }

  const handleThemeChange = (value: string) => {
    updatePreferences({ theme: value as 'system' | 'light' | 'dark' });
  };

  const handleToggle = (key: keyof typeof preferences) => {
    updatePreferences({ [key]: !preferences[key] });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>User Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={preferences.theme}
              onValueChange={handleThemeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="shareProfile">Share Profile</Label>
            <Switch
              id="shareProfile"
              checked={preferences.shareProfile}
              onCheckedChange={() => handleToggle('shareProfile')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showOnlineStatus">Show Online Status</Label>
            <Switch
              id="showOnlineStatus"
              checked={preferences.showOnlineStatus}
              onCheckedChange={() => handleToggle('showOnlineStatus')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allowMessagePreviews">Message Previews</Label>
            <Switch
              id="allowMessagePreviews"
              checked={preferences.allowMessagePreviews}
              onCheckedChange={() => handleToggle('allowMessagePreviews')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notificationSound">Notification Sound</Label>
            <Switch
              id="notificationSound"
              checked={preferences.notificationSound}
              onCheckedChange={() => handleToggle('notificationSound')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="desktopNotifications">Desktop Notifications</Label>
            <Switch
              id="desktopNotifications"
              checked={preferences.desktopNotifications}
              onCheckedChange={() => handleToggle('desktopNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="emailNotifications">Email Notifications</Label>
            <Switch
              id="emailNotifications"
              checked={preferences.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 