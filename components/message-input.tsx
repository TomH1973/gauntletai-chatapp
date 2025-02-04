import { useState } from 'react'
import { RichTextEditor } from './chat/rich-text-editor'
import { Button } from './ui/button'
import { Send } from 'lucide-react'
import { useSocket } from '@/hooks/use-socket'
import { useThread } from '@/hooks/use-thread'
import { useUser } from '@clerk/nextjs'

interface MessageInputProps {
  className?: string
}

export function MessageInput({ className }: MessageInputProps) {
  const [content, setContent] = useState('')
  const socket = useSocket()
  const { activeThread } = useThread()
  const { user } = useUser()

  const handleSend = () => {
    if (!content.trim() || !activeThread || !user) return

    socket?.emit('message', {
      threadId: activeThread.id,
      content,
      userId: user.id,
    })

    setContent('')
  }

  const handleMentionSearch = async (query: string) => {
    // Implement user search for mentions
    return [] // TODO: Implement user search
  }

  const handleImageUpload = async (file: File) => {
    // Implement image upload
    return '' // TODO: Implement image upload
  }

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Type a message..."
            onMentionSearch={handleMentionSearch}
            onImageUpload={handleImageUpload}
            className="min-h-[100px]"
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!content.trim()}
          className="mb-2"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 