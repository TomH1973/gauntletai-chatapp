# Required Schema Updates for Security Implementation

## User Model Updates
- Add `metadata` relation for sensitive data
  ```prisma
  model UserMetadata {
    id          String   @id @default(cuid())
    userId      String   @unique
    user        User     @relation(fields: [userId], references: [id])
    phoneNumber String?  @encrypted
    address     String?  @encrypted
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```

## Key Management Tables
- Add `KeyRotation` table for encryption key management
  ```prisma
  model KeyRotation {
    id        String   @id @default(cuid())
    key       String   @encrypted
    active    Boolean  @default(true)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  ```

- Add `UserKeys` table for E2E encryption
  ```prisma
  model UserKeys {
    id                 String   @id @default(cuid())
    userId            String   @unique
    user              User     @relation(fields: [userId], references: [id])
    publicKey         String
    encryptedPrivateKey String @encrypted
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt
  }
  ```

## Thread Model Updates
- Add `type` field for direct message support
  ```prisma
  model Thread {
    // ... existing fields ...
    type        String    @default("GROUP") // "GROUP" | "DIRECT"
  }
  ```

## Message Model Updates
- Add `senderId` and `encrypted` fields
  ```prisma
  model Message {
    // ... existing fields ...
    senderId   String
    sender     User     @relation(fields: [senderId], references: [id])
    encrypted  Boolean  @default(false)
  }
  ```

## Implementation Priority
- Medium: Required for full security implementation but not blocking other development
- Can be implemented in parallel with other features
- Required before production deployment

## Migration Strategy
1. Create migrations in development environment
2. Test with sample data
3. Plan production deployment with zero downtime
4. Include data migration for any existing messages 