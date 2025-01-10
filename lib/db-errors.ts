import { Prisma } from '@prisma/client';

export enum DatabaseErrorCode {
  UNIQUE_CONSTRAINT = 'P2002',
  FOREIGN_KEY = 'P2003',
  NOT_FOUND = 'P2025',
  REQUIRED_FIELD = 'P2011',
  INVALID_DATA = 'P2001',
}

export class DatabaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function handleDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case DatabaseErrorCode.UNIQUE_CONSTRAINT:
        throw new DatabaseError(
          error.code,
          'A record with this value already exists.',
          { fields: error.meta?.target }
        );
      case DatabaseErrorCode.FOREIGN_KEY:
        throw new DatabaseError(
          error.code,
          'Referenced record does not exist.',
          { fields: error.meta?.field_name }
        );
      case DatabaseErrorCode.NOT_FOUND:
        throw new DatabaseError(
          error.code,
          'Record not found.',
          { details: error.meta }
        );
      case DatabaseErrorCode.REQUIRED_FIELD:
        throw new DatabaseError(
          error.code,
          'Required field is missing.',
          { fields: error.meta?.target }
        );
      default:
        throw new DatabaseError(
          error.code,
          'Database operation failed.',
          error.meta
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new DatabaseError(
      DatabaseErrorCode.INVALID_DATA,
      'Invalid data provided.',
      { message: error.message }
    );
  }

  if (error instanceof Error) {
    throw new DatabaseError(
      'UNKNOWN',
      'An unexpected database error occurred.',
      { originalError: error.message }
    );
  }

  throw new DatabaseError(
    'UNKNOWN',
    'An unknown error occurred.',
    { error }
  );
}

export function withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  return operation().catch(handleDatabaseError);
}

// Utility function for common database operations
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    handleDatabaseError(error);
  }
} 