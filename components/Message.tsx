import React from 'react';
import { User } from './User';
import FilePreview from './FilePreview';
import { useFileDownload } from '../hooks/useFileDownload';

interface MessageProps {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  isEdited?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
}

export const Message: React.FC<MessageProps> = ({
  content,
  sender,
  timestamp,
  isEdited,
  attachments = [],
}) => {
  const { downloadFile, progress } = useFileDownload();

  const handleDownload = (url: string) => {
    downloadFile(url);
  };

  return (
    <div className="flex items-start space-x-3 p-4 hover:bg-gray-50">
      <User id={sender.id} name={sender.name} avatar={sender.avatar} />
      
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline space-x-2">
          <span className="font-medium">{sender.name}</span>
          <span className="text-sm text-gray-500">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
          {isEdited && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>

        <p className="text-gray-900">{content}</p>

        {attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {attachments.map((attachment) => (
              <FilePreview
                key={attachment.id}
                file={attachment}
                downloadProgress={progress[attachment.url]}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 