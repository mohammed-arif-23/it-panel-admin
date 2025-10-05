// Admin Panel Error Handling System
// Provides actionable error messages and detailed logging for admin actions

export interface AdminErrorContext {
  code?: string;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  userAction?: string;
  userId?: string;
  userRole?: string;
  timestamp?: number;
}

export interface AdminActionableError {
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
  retryAction?: () => Promise<void>;
  supportLink?: string;
  icon?: 'error' | 'warning' | 'info';
  logId?: string;
}

class AdminErrorHandler {
  private static instance: AdminErrorHandler;
  private errorLog: Array<{ 
    id: string; 
    timestamp: number; 
    error: any; 
    context: AdminErrorContext;
    stackTrace?: string;
  }> = [];
  private maxLogSize = 100;

  private constructor() {}

  static getInstance(): AdminErrorHandler {
    if (!AdminErrorHandler.instance) {
      AdminErrorHandler.instance = new AdminErrorHandler();
    }
    return AdminErrorHandler.instance;
  }

  /**
   * Handle and transform error into actionable format
   */
  handle(error: any, context?: AdminErrorContext): AdminActionableError {
    // Generate unique log ID
    const logId = this.generateLogId();
    
    // Log error for debugging
    this.logError(error, context, logId);

    // Network errors
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return {
        ...this.getNetworkError(),
        logId
      };
    }

    // Authentication errors
    if (error.statusCode === 401 || error.code === 'UNAUTHORIZED') {
      return {
        ...this.getAuthError(),
        logId
      };
    }

    // Permission errors
    if (error.statusCode === 403 || error.code === 'FORBIDDEN') {
      return {
        ...this.getPermissionError(),
        logId
      };
    }

    // Not found errors
    if (error.statusCode === 404) {
      return {
        ...this.getNotFoundError(context),
        logId
      };
    }

    // Validation errors
    if (error.statusCode === 400 || error.code === 'VALIDATION_ERROR') {
      return {
        ...this.getValidationError(error),
        logId
      };
    }

    // Server errors
    if (error.statusCode >= 500) {
      return {
        ...this.getServerError(),
        logId
      };
    }

    // Student management errors
    if (context?.endpoint?.includes('/students')) {
      return {
        ...this.getStudentManagementError(error, context),
        logId
      };
    }

    // Assignment errors
    if (context?.endpoint?.includes('/assignments')) {
      return {
        ...this.getAssignmentError(error, context),
        logId
      };
    }

    // Seminar errors
    if (context?.endpoint?.includes('/seminar')) {
      return {
        ...this.getSeminarError(error, context),
        logId
      };
    }

    // Notification errors
    if (context?.endpoint?.includes('/notifications')) {
      return {
        ...this.getNotificationError(error, context),
        logId
      };
    }

    // Database errors
    if (error.code?.startsWith('PGRST') || error.code?.startsWith('23505')) {
      return {
        ...this.getDatabaseError(error),
        logId
      };
    }

    // Generic error
    return {
      ...this.getGenericError(error),
      logId
    };
  }

  private getNetworkError(): AdminActionableError {
    return {
      title: '🌐 Connection Problem',
      message: 'Unable to connect to the server. Please check your internet connection.',
      suggestions: [
        'Check if you are connected to Wi-Fi or mobile data',
        'Try turning airplane mode off and on',
        'If problem persists, contact your network administrator'
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  private getAuthError(): AdminActionableError {
    return {
      title: '🔒 Authentication Required',
      message: 'Your session has expired. Please log in again to continue.',
      suggestions: [
        'Click the button below to log in again',
        'Make sure you are using the correct credentials',
        'If you continue to have issues, contact your system administrator'
      ],
      canRetry: false,
      supportLink: '/login',
      icon: 'warning'
    };
  }

  private getPermissionError(): AdminActionableError {
    return {
      title: '⛔ Access Denied',
      message: 'You do not have permission to perform this action.',
      suggestions: [
        'This feature may be restricted to certain user roles',
        'Contact your system administrator if you believe this is an error',
        'Verify that you are logged in with the correct account'
      ],
      canRetry: false,
      icon: 'error'
    };
  }

  private getNotFoundError(context?: AdminErrorContext): AdminActionableError {
    return {
      title: '🔍 Not Found',
      message: 'The requested resource could not be found.',
      suggestions: [
        'The item may have been deleted or moved',
        'Check if you are using the correct identifier',
        'Try refreshing the page',
        'Go back to the dashboard and try again'
      ],
      canRetry: false,
      icon: 'error'
    };
  }

  private getValidationError(error: any): AdminActionableError {
    const message = error.message || 'The information you provided is invalid.';
    return {
      title: '⚠️ Invalid Input',
      message,
      suggestions: [
        'Check that all required fields are filled',
        'Ensure data is in the correct format',
        'Remove any special characters if not allowed',
        'Refer to field-specific requirements'
      ],
      canRetry: true,
      icon: 'warning'
    };
  }

  private getServerError(): AdminActionableError {
    return {
      title: '🔧 Server Error',
      message: 'Something went wrong on our end. We are working to fix it.',
      suggestions: [
        'Please try again in a few minutes',
        'If this continues, contact support with error details',
        'Check system status for ongoing issues'
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  private getStudentManagementError(error: any, context?: AdminErrorContext): AdminActionableError {
    if (error.message?.includes('already exists')) {
      return {
        title: '👥 Duplicate Student',
        message: 'A student with this register number or email already exists.',
        suggestions: [
          'Verify the register number and email are correct',
          'Check if the student is already in the system',
          'Contact support if you believe this is an error'
        ],
        canRetry: false,
        icon: 'warning'
      };
    }

    if (error.message?.includes('register number')) {
      return {
        title: '🔢 Invalid Register Number',
        message: 'Register number must be exactly 12 digits.',
        suggestions: [
          'Ensure the register number is exactly 12 digits',
          'Check for any extra spaces or characters',
          'Verify the number format matches your institution standards'
        ],
        canRetry: true,
        icon: 'warning'
      };
    }

    if (error.message?.includes('email')) {
      return {
        title: '📧 Invalid Email',
        message: 'Please enter a valid email address.',
        suggestions: [
          'Ensure the email follows the format: user@example.com',
          'Check for any typos in the email address',
          'Verify the domain is correct'
        ],
        canRetry: true,
        icon: 'warning'
      };
    }

    return {
      title: '👥 Student Management Failed',
      message: 'Unable to complete student management operation.',
      suggestions: [
        'Check all required fields are filled correctly',
        'Ensure data formats are correct',
        'Try again in a few moments',
        'Contact support if the problem persists'
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  private getAssignmentError(error: any, context?: AdminErrorContext): AdminActionableError {
    if (error.message?.includes('deadline')) {
      return {
        title: '⏰ Deadline Issue',
        message: 'Assignment deadline has already passed or is invalid.',
        suggestions: [
          'Set a future deadline for new assignments',
          'Contact faculty to request deadline extension if needed',
          'Verify the date and time format is correct'
        ],
        canRetry: false,
        icon: 'warning'
      };
    }

    if (error.message?.includes('title')) {
      return {
        title: '📝 Assignment Title Required',
        message: 'Assignment title is required and must be unique.',
        suggestions: [
          'Enter a descriptive title for the assignment',
          'Ensure the title is not already used',
          'Keep the title concise but informative'
        ],
        canRetry: true,
        icon: 'warning'
      };
    }

    return {
      title: '📝 Assignment Operation Failed',
      message: 'Unable to complete assignment operation.',
      suggestions: [
        'Check all required fields are filled',
        'Ensure date and time formats are correct',
        'Try again in a few moments',
        'Contact support if the problem persists'
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  private getSeminarError(error: any, context?: AdminErrorContext): AdminActionableError {
    if (error.message?.includes('date')) {
      return {
        title: '📅 Invalid Date',
        message: 'Please select a valid seminar date.',
        suggestions: [
          'Ensure the date is in the future',
          'Check that the date is not already booked',
          'Verify the date format is correct'
        ],
        canRetry: true,
        icon: 'warning'
      };
    }

    if (error.message?.includes('already')) {
      return {
        title: '📅 Booking Conflict',
        message: 'This date is already booked or conflicts with existing bookings.',
        suggestions: [
          'Select a different date for the seminar',
          'Check the seminar calendar for available dates',
          'Contact support if you believe this is an error'
        ],
        canRetry: false,
        icon: 'warning'
      };
    }

    return {
      title: '📅 Seminar Operation Failed',
      message: 'Unable to complete seminar operation.',
      suggestions: [
        'Check all required fields are filled',
        'Ensure date formats are correct',
        'Try again in a few moments',
        'Contact support if the problem persists'
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  private getNotificationError(error: any, context?: AdminErrorContext): AdminActionableError {
    if (error.message?.includes('target')) {
      return {
        title: '📢 Invalid Target',
        message: 'Please select a valid notification target.',
        suggestions: [
          'Ensure you have selected at least one recipient',
          'Check that the target group exists',
          'Verify target selection criteria'
        ],
        canRetry: true,
        icon: 'warning'
      };
    }

    if (error.message?.includes('title') || error.message?.includes('body')) {
      return {
        title: '📢 Invalid Notification',
        message: 'Notification title and body are required.',
        suggestions: [
          'Enter a title for your notification',
          'Add content to the message body',
          'Keep messages concise and clear'
        ],
        canRetry: true,
        icon: 'warning'
      };
    }

    return {
      title: '📢 Notification Failed',
      message: 'Unable to send notification.',
      suggestions: [
        'Check your notification content',
        'Verify recipient targets are valid',
        'Try again in a few moments',
        'Contact support if the problem persists'
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  private getDatabaseError(error: any): AdminActionableError {
    return {
      title: '🗄️ Database Error',
      message: 'Unable to access data at this time.',
      suggestions: [
        'Try refreshing the page',
        'If this persists, contact system administrator',
        'Error code: ' + (error.code || 'Unknown')
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  private getGenericError(error: any): AdminActionableError {
    return {
      title: '❌ Something Went Wrong',
      message: error.message || 'An unexpected error occurred.',
      suggestions: [
        'Try refreshing the page',
        'Clear your browser cache if the problem persists',
        'Contact support with the error ID for assistance',
        'Error: ' + (error.message || 'Unknown error')
      ],
      canRetry: true,
      icon: 'error'
    };
  }

  /**
   * Log error for debugging with detailed context
   */
  private logError(error: any, context?: AdminErrorContext, logId?: string): void {
    const timestamp = Date.now();
    const errorEntry = {
      id: logId || this.generateLogId(),
      timestamp,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode
      },
      context: {
        ...context,
        timestamp
      },
      stackTrace: error.stack
    };

    this.errorLog.push(errorEntry);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin Error:', errorEntry);
    }

    // In production, we might want to send to a logging service
    if (process.env.NODE_ENV === 'production') {
      // This would be where we send to a logging service like Sentry
      // For now, we'll just console.log in production too
      console.error('Admin Error (Production):', errorEntry);
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get error log for debugging
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Get error by ID
   */
  getErrorById(id: string) {
    return this.errorLog.find(entry => entry.id === id);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log for support
   */
  exportErrorLog(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByTime: Array<{ hour: number; count: number }>;
  } {
    const errorsByType: Record<string, number> = {};
    const errorsByTime: Record<number, number> = {};
    
    this.errorLog.forEach(entry => {
      // Count by error type
      const type = entry.error.code || entry.error.statusCode || 'UNKNOWN';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
      
      // Count by hour
      const hour = new Date(entry.timestamp).getHours();
      errorsByTime[hour] = (errorsByTime[hour] || 0) + 1;
    });
    
    const errorsByTimeArray = Object.entries(errorsByTime).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    }));
    
    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsByTime: errorsByTimeArray
    };
  }
}

export const adminErrorHandler = AdminErrorHandler.getInstance();