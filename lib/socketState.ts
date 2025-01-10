import { SocketState } from '@/types/chat';

/**
 * In-memory implementation of socket state management.
 * For production, consider using Redis or another distributed state solution.
 */
class SocketStateManager implements SocketState {
    private typingUsers: Map<string, Set<string>> = new Map(); // threadId -> Set of userIds
    private onlineUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

    async setTyping(userId: string, threadId: string): Promise<void> {
        if (!this.typingUsers.has(threadId)) {
            this.typingUsers.set(threadId, new Set());
        }
        this.typingUsers.get(threadId)!.add(userId);

        // Auto-clear typing status after 5 seconds
        setTimeout(() => {
            this.clearTyping(userId, threadId);
        }, 5000);
    }

    async clearTyping(userId: string, threadId: string): Promise<void> {
        const threadTyping = this.typingUsers.get(threadId);
        if (threadTyping) {
            threadTyping.delete(userId);
            if (threadTyping.size === 0) {
                this.typingUsers.delete(threadId);
            }
        }
    }

    getTypingUsers(threadId: string): string[] {
        return Array.from(this.typingUsers.get(threadId) || []);
    }

    async isUserOnline(userId: string): Promise<boolean> {
        const userSockets = this.onlineUsers.get(userId);
        return userSockets !== undefined && userSockets.size > 0;
    }

    async addUserSocket(userId: string, socketId: string): Promise<void> {
        if (!this.onlineUsers.has(userId)) {
            this.onlineUsers.set(userId, new Set());
        }
        this.onlineUsers.get(userId)!.add(socketId);
    }

    async removeUserSocket(userId: string, socketId: string): Promise<boolean> {
        const userSockets = this.onlineUsers.get(userId);
        if (!userSockets) {
            return false;
        }

        userSockets.delete(socketId);
        if (userSockets.size === 0) {
            this.onlineUsers.delete(userId);
        }
        return true;
    }

    // Helper method to get all online users
    getAllOnlineUsers(): string[] {
        return Array.from(this.onlineUsers.keys());
    }

    // Helper method to clean up user state
    cleanupUser(userId: string): void {
        // Remove from online users
        this.onlineUsers.delete(userId);

        // Remove from all typing states
        Array.from(this.typingUsers.keys()).forEach(threadId => {
            const users = this.typingUsers.get(threadId);
            if (users?.has(userId)) {
                this.clearTyping(userId, threadId);
            }
        });
    }
}

// Export a singleton instance
export const socketState = new SocketStateManager(); 