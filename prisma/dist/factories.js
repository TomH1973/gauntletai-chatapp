import { SystemRole, ParticipantRole, MessageStatus } from '@prisma/client';
import { z } from 'zod';
// Validation schemas
export const UserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    systemRole: z.nativeEnum(SystemRole),
    clerkId: z.string().min(1),
    image: z.string().url()
});
export const ThreadParticipantSchema = z.object({
    userId: z.string().min(1),
    role: z.nativeEnum(ParticipantRole)
});
export const ThreadSchema = z.object({
    name: z.string().min(1),
    participants: z.object({
        create: z.array(ThreadParticipantSchema)
    })
});
export const MessageSchema = z.object({
    content: z.string().min(1),
    userId: z.string().min(1),
    threadId: z.string().min(1),
    status: z.nativeEnum(MessageStatus)
});
// Factory functions
export function createUserData(overrides = {}) {
    const defaultData = {
        email: 'user@example.com',
        name: 'Test User',
        systemRole: SystemRole.MEMBER,
        clerkId: `user_${Date.now()}`,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`
    };
    const data = { ...defaultData, ...overrides };
    return UserSchema.parse(data);
}
export function createThreadParticipantData(userId, role = ParticipantRole.MEMBER) {
    return ThreadParticipantSchema.parse({ userId, role });
}
export function createThreadData(name, participants) {
    return ThreadSchema.parse({
        name,
        participants: {
            create: participants
        }
    });
}
export function createMessageData(userId, threadId, content) {
    return MessageSchema.parse({
        content,
        userId,
        threadId,
        status: MessageStatus.SENT
    });
}
// Environment checks
export function validateEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL is not set');
    }
    if (env === 'production' && !process.env.SEED_PRODUCTION_CONFIRMED) {
        throw new Error('Seeding in production requires explicit confirmation');
    }
    return true;
}
