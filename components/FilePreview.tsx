import React, { useState } from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { Document, Page } from 'react-pdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { Loader2 } from 'lucide-react';

interface FilePreviewProps {
  file: {
    name: string;
    type: string;
    url: string;
    size: number;
  };
  downloadProgress?: number;
  onDownload?: (url: string) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, downloadProgress, onDownload }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getFileType = (type: string) => {
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('archive') || type.includes('zip')) return 'archive';
    return 'document';
  };

  const renderPreview = () => {
    const fileType = getFileType(file.type);
    const extension = getFileExtension(file.name);

    switch (fileType) {
      case 'image':
        return (
          <div className="relative group cursor-pointer" onClick={() => setIsPreviewOpen(true)}>
            <img 
              src={file.url} 
              alt={file.name}
              className="max-w-xs rounded-lg shadow-md hover:shadow-lg transition-shadow"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span className="text-white">Click to preview</span>
            </div>
          </div>
        );
      
      case 'pdf':
        return (
          <div onClick={() => setIsPreviewOpen(true)} className="cursor-pointer">
            <div className="w-16 h-16">
              <FileIcon extension="pdf" {...defaultStyles.pdf} />
            </div>
            <span className="text-sm mt-1 block">{file.name}</span>
          </div>
        );

      case 'video':
        return (
          <div className="max-w-xs">
            <video controls className="rounded-lg shadow-md">
              <source src={file.url} type={file.type} />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="max-w-xs">
            <audio controls className="w-full">
              <source src={file.url} type={file.type} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      default:
        return (
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12">
              <FileIcon extension={extension} {...defaultStyles[extension as keyof typeof defaultStyles]} />
            </div>
            <span className="text-sm">{file.name}</span>
          </div>
        );
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file.url);
    }
  };

  return (
    <div className="relative">
      {renderPreview()}
      
      {downloadProgress !== undefined && downloadProgress < 100 && (
        <div className="mt-2">
          <Progress value={downloadProgress} className="h-1" />
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-500">{downloadProgress}%</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>
      )}

      {downloadProgress === undefined && (
        <button
          onClick={handleDownload}
          className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Download
        </button>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{file.name}</DialogTitle>
          </DialogHeader>
          
          {getFileType(file.type) === 'image' && (
            <img src={file.url} alt={file.name} className="w-full h-auto" />
          )}
          
          {getFileType(file.type) === 'pdf' && (
            <Document
              file={file.url}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="max-h-[80vh] overflow-auto"
            >
              {Array.from(new Array(numPages || 0), (_, index) => (
                <Page 
                  key={`page_${index + 1}`} 
                  pageNumber={index + 1}
                  width={800}
                />
              ))}
            </Document>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FilePreview; 