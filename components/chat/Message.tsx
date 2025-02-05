import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { User } from '@prisma/client';
import { FileGallery } from './FileGallery';
import { useFileDownload } from '@/hooks/useFileDownload';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Reactions } from './Reactions';

interface MessageProps {
  id: string;
  content: string;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  attachments?: Array<{
    id: string;
    url: string;
    filename: string;
    fileType: string;
  }>;
  isEdited?: boolean;
  className?: string;
  isLast?: boolean;
}

export function Message({
  id,
  content,
  createdAt,
  user,
  attachments = [],
  isEdited,
  className,
  isLast,
}: MessageProps) {
  const { downloadFile, progress } = useFileDownload();

  const handleDownload = async (url: string) => {
    await downloadFile(url);
  };

  return (
    <div className={cn(
      'flex flex-col space-y-2 p-4',
      isLast && 'pb-8'
    )}>
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={user.image || undefined} />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{user.name}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
            {isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {content}
          </div>
          <Reactions messageId={id} />
          {attachments.length > 0 && (
            <div className="mt-2">
              <FileGallery
                files={attachments}
                onDownload={handleDownload}
                downloadProgress={progress}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 