import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import logger from '@/lib/logger';
import { metrics } from '@/app/api/metrics/route';
import { v4 as uuidv4 } from 'uuid';

// Error taxonomy
export enum ErrorCode {
  // Client Errors (4xx)
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  
  // Server Errors (5xx)
  INTERNAL_ERROR = 'internal_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  DATABASE_ERROR = 'database_error',
  INTEGRATION_ERROR = 'integration_error'
}

interface ErrorDetails {
  field?: string;
  reason?: string;
  help?: string;
  trace?: string;
}

interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
    requestId: string;
  };
}

// Error definitions with user-friendly messages
const errorDefinitions: Record<ErrorCode, { status: number; message: string }> = {
  [ErrorCode.UNAUTHORIZED]: {
    status: 401,
    message: 'Authentication required to access this resource'
  },
  [ErrorCode.FORBIDDEN]: {
    status: 403,
    message: 'You do not have permission to perform this action'
  },
  [ErrorCode.VALIDATION_ERROR]: {
    status: 400,
    message: 'The provided input is invalid'
  },
  [ErrorCode.NOT_FOUND]: {
    status: 404,
    message: 'The requested resource was not found'
  },
  [ErrorCode.CONFLICT]: {
    status: 409,
    message: 'The request conflicts with the current state'
  },
  [ErrorCode.RATE_LIMIT]: {
    status: 429,
    message: 'Too many requests, please try again later'
  },
  [ErrorCode.INTERNAL_ERROR]: {
    status: 500,
    message: 'An unexpected error occurred'
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    status: 503,
    message: 'The service is temporarily unavailable'
  },
  [ErrorCode.DATABASE_ERROR]: {
    status: 500,
    message: 'A database error occurred'
  },
  [ErrorCode.INTEGRATION_ERROR]: {
    status: 502,
    message: 'An error occurred while communicating with an external service'
  }
};

// Type-safe response builder
export class ApiResponse {
  static success<T>(data: T, headers?: HeadersInit) {
    return NextResponse.json(data, { headers });
  }

  static error(
    code: ErrorCode,
    details?: ErrorDetails,
    headers?: HeadersInit
  ): NextResponse<ErrorResponse> {
    const requestId = uuidv4();
    const errorDef = errorDefinitions[code];
    
    // Log error with context
    logger.error({
      code,
      requestId,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    });

    // Track error metrics
    metrics.errorCounter.inc({
      type: code,
      code: errorDef.status.toString(),
      path: details?.field || 'unknown'
    });

    const error: ErrorResponse = {
      error: {
        code,
        message: errorDef.message,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
        requestId
      }
    };

    return NextResponse.json(error, {
      status: errorDef.status,
      headers
    });
  }

  static unauthorized(details?: ErrorDetails) {
    return this.error(ErrorCode.UNAUTHORIZED, details);
  }

  static forbidden(details?: ErrorDetails) {
    return this.error(ErrorCode.FORBIDDEN, details);
  }

  static notFound(details?: ErrorDetails) {
    return this.error(ErrorCode.NOT_FOUND, details);
  }

  static validationError(details?: ErrorDetails) {
    return this.error(ErrorCode.VALIDATION_ERROR, details);
  }

  static conflict(details?: ErrorDetails) {
    return this.error(ErrorCode.CONFLICT, details);
  }

  static rateLimit(details?: ErrorDetails) {
    return this.error(ErrorCode.RATE_LIMIT, details);
  }

  static internal(details?: ErrorDetails) {
    return this.error(ErrorCode.INTERNAL_ERROR, details);
  }
}

// Helper to ensure authenticated requests
export async function withAuth<T>(
  handler: (userId: string) => Promise<T>
): Promise<T | NextResponse<ErrorResponse>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiResponse.unauthorized({
        reason: 'No authenticated user found',
        help: 'Please sign in to access this resource'
      });
    }
    return await handler(userId);
  } catch (error) {
    logger.error('Authentication error:', error);
    return ApiResponse.internal({
      reason: 'Failed to authenticate request',
      trace: error instanceof Error ? error.message : undefined
    });
  }
}

// Helper to handle common try-catch patterns
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  errorMapper?: (error: unknown) => ErrorResponse
): Promise<T | NextResponse<ErrorResponse>> {
  try {
    return await handler();
  } catch (error) {
    logger.error('Request error:', error);
    
    if (errorMapper) {
      const mappedError = errorMapper(error);
      return NextResponse.json(mappedError, {
        status: errorDefinitions[mappedError.error.code].status
      });
    }

    return ApiResponse.internal({
      reason: 'An unexpected error occurred',
      trace: error instanceof Error ? error.message : undefined
    });
  }
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'ApiError';
  }
} 