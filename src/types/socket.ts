export interface ServerToClientEvents {
  message: (data: { text: string; userId: string; username: string; timestamp: string; aiGenerated: boolean }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  message: (data: { text: string }) => void;
} 