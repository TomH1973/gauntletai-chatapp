import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Progress } from './progress'

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  maxSize?: number
  accept?: string[]
  multiple?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = ['image/*', 'application/pdf'],
  multiple = false
}) => {
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setError('')
    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (const file of acceptedFiles) {
        if (file.size > maxSize) {
          throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
        }

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 500)

        await onUpload(file)
        
        clearInterval(progressInterval)
        setUploadProgress(100)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [maxSize, onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept: accept.reduce((acc, curr) => ({ ...acc, [curr]: [] }), {}),
    multiple,
    disabled: isUploading
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-primary">Drop files here...</p>
        ) : (
          <p>Drag & drop files here, or click to select</p>
        )}
        <p className="text-sm text-gray-500 mt-2">
          {accept.join(', ')} files up to {maxSize / (1024 * 1024)}MB
        </p>
      </div>

      {isUploading && (
        <div className="mt-4">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-center mt-2">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  )
} 