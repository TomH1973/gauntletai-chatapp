# 🔍 Testing Snag List

> **Purpose**: Track issues discovered during systematic testing
> **Status**: Active testing in progress
> **Priority**: Highest severity first

## Database Setup Issues
Testing Step: Clean Database State (CHECKLIST_TEST.md:9)

### Attempted Steps
```bash
# Executing database reset sequence
npx prisma db push --force-reset
npx prisma db seed
```

### Issues Found
1. [ ] Issue: Seed script missing required user fields
   - Severity: High
   - Status: Found
   - Details:
     - Missing `clerkId` (required, unique)
     - Missing `name` field
     - Missing `image` field
     - Role defaults not set
   - Impact: Will cause Clerk authentication issues
   - Fix Required: Update seed.ts with complete user data

2. [ ] Issue: Thread roles not properly initialized
   - Severity: Medium
   - Status: Found
   - Details:
     - All participants set as 'member'
     - No OWNER role assigned
     - Incorrect role casing ('member' vs 'MEMBER')
   - Impact: Role-based permission testing will fail
   - Fix Required: Update thread creation with proper role hierarchy

3. [ ] Issue: Need to verify database reset command works
   - Severity: High
   - Status: Testing
   - Steps to Reproduce:
     1. Run reset command
     2. Verify database state
   - Expected: Clean database with only seed data
   - Actual: TBD

## Active Testing
Current Focus: Database State Verification
- [x] Verify Prisma schema is current
- [x] Check seed data script
- [ ] Validate connection string
- [ ] Test reset command
- [ ] Verify clean state

## Notes
- Start timestamp: [Current Date/Time]
- Testing environment: Local development
- Database: PostgreSQL
- Test user: TBD
- Seed script exists but needs significant updates
- Need to align seed data with authentication requirements 