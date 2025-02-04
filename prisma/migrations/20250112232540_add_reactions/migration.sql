/*
  Warnings:

  - You are about to drop the column `isEdited` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `editedAt` on the `MessageEdit` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Reaction` table. All the data in the column will be lost.
  - The primary key for the `ThreadParticipant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ThreadParticipant` table. All the data in the column will be lost.
  - The `role` column on the `ThreadParticipant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `isActive` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MessageRead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserPreferences` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[messageId,emoji]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Reaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `Thread` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_uploaderId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- DropForeignKey
ALTER TABLE "MessageEdit" DROP CONSTRAINT "MessageEdit_editedBy_fkey";

-- DropForeignKey
ALTER TABLE "MessageRead" DROP CONSTRAINT "MessageRead_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageRead" DROP CONSTRAINT "MessageRead_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_messageId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "ThreadParticipant" DROP CONSTRAINT "ThreadParticipant_threadId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_userId_fkey";

-- DropIndex
DROP INDEX "Message_parentId_idx";

-- DropIndex
DROP INDEX "Reaction_messageId_userId_emoji_key";

-- DropIndex
DROP INDEX "Reaction_userId_idx";

-- DropIndex
DROP INDEX "Thread_updatedAt_idx";

-- DropIndex
DROP INDEX "ThreadParticipant_userId_threadId_key";

-- DropIndex
DROP INDEX "User_clerkId_idx";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "isEdited",
DROP COLUMN "parentId";

-- AlterTable
ALTER TABLE "MessageEdit" DROP COLUMN "editedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Reaction" DROP COLUMN "userId",
ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "users" TEXT[];

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "lastMessageAt" TIMESTAMP(3),
ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "ThreadParticipant" DROP CONSTRAINT "ThreadParticipant_pkey",
DROP COLUMN "id",
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'MEMBER',
ADD CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("userId", "threadId");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isActive",
DROP COLUMN "lastLoginAt",
DROP COLUMN "role",
ALTER COLUMN "name" SET NOT NULL;

-- DropTable
DROP TABLE "Attachment";

-- DropTable
DROP TABLE "MessageRead";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "UserPreferences";

-- DropEnum
DROP TYPE "FileType";

-- DropEnum
DROP TYPE "ParticipantRole";

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_userId_createdAt_idx" ON "Message"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_content_idx" ON "Message"("content");

-- CreateIndex
CREATE INDEX "MessageEdit_createdAt_idx" ON "MessageEdit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_messageId_emoji_key" ON "Reaction"("messageId", "emoji");

-- CreateIndex
CREATE INDEX "Thread_createdAt_idx" ON "Thread"("createdAt");

-- CreateIndex
CREATE INDEX "Thread_lastMessageAt_idx" ON "Thread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ThreadParticipant_role_idx" ON "ThreadParticipant"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEdit" ADD CONSTRAINT "MessageEdit_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
