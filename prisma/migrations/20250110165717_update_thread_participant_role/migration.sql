/*
  Warnings:

  - The `role` column on the `ThreadParticipant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ThreadParticipant" DROP COLUMN "role",
ADD COLUMN     "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER';
