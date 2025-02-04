import { create } from 'zustand'

interface Thread {
  id: string
  name: string
  participants: Array<{
    id: string
    username: string
  }>
}

interface ThreadStore {
  activeThread: Thread | null
  setActiveThread: (thread: Thread | null) => void
}

export const useThread = create<ThreadStore>((set) => ({
  activeThread: null,
  setActiveThread: (thread) => set({ activeThread: thread }),
})) 