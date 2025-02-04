import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser } from '@clerk/nextjs'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const { user } = useUser()

  useEffect(() => {
    if (!user) return

    const newSocket = io('http://localhost:3002', {
      auth: {
        userId: user.id,
      },
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [user])

  return socket
} 