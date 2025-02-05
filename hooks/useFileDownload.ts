import { useState } from 'react';

export type ProgressMap = { [key: string]: number };

export function useFileDownload() {
  const [progress, setProgress] = useState<ProgressMap>({});

  const downloadFile = async (url: string) => {
    try {
      const response = await fetch(url);
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Failed to get reader');
      }

      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        receivedLength += value.length;

        if (total > 0) {
          setProgress(prev => ({
            ...prev,
            [url]: Math.round((receivedLength / total) * 100)
          }));
        }
      }

      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = url.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setProgress(prev => {
        const { [url]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error('Download failed:', error);
      setProgress(prev => {
        const { [url]: _, ...rest } = prev;
        return rest;
      });
      throw error;
    }
  };

  return { downloadFile, progress };
} 