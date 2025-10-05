// Admin Panel Audit Logging System
// Tracks all admin actions for security and compliance

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  duration?: number; // in milliseconds
}

class AuditLogger {
  private static instance: AuditLogger;
  private auditLog: AuditLogEntry[] = [];
  private maxLogSize = 500;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an admin action
   */
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): string {
    const id = this.generateLogId();
    const timestamp = Date.now();
    
    const logEntry: AuditLogEntry = {
      id,
      timestamp,
      ...entry
    };

    this.auditLog.push(logEntry);

    // Keep log size manageable
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit Log:', logEntry);
    }

    // In production, we might want to send to a logging service
    if (process.env.NODE_ENV === 'production') {
      // This would be where we send to a logging service
      // For now, we'll just console.log in production too
      console.log('Audit Log (Production):', logEntry);
    }

    return id;
  }

  /**
   * Log a successful admin action
   */
  logSuccess(
    userId: string,
    userRole: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: any,
    startTime?: number
  ): string {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    return this.logAction({
      userId,
      userRole,
      action,
      resource,
      resourceId,
      details,
      success: true,
      duration
    });
  }

  /**
   * Log a failed admin action
   */
  logFailure(
    userId: string,
    userRole: string,
    action: string,
    resource: string,
    error: string,
    resourceId?: string,
    details?: any,
    startTime?: number
  ): string {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    return this.logAction({
      userId,
      userRole,
      action,
      resource,
      resourceId,
      details,
      success: false,
      errorMessage: error,
      duration
    });
  }

  /**
   * Get audit logs with optional filters
   */
  getLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: number;
    endDate?: number;
    success?: boolean;
    limit?: number;
  }): AuditLogEntry[] {
    let filteredLogs = [...this.auditLog];

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      
      if (filters.resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
      }
      
      if (filters.startDate !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      
      if (filters.endDate !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
      
      if (filters.success !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.success === filters.success);
      }
    }

    // Sort by timestamp descending (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  /**
   * Get audit log statistics
   */
  getStats(period: '24h' | '7d' | '30d' = '7d'): {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    actionsByResource: Record<string, number>;
    actionsByUser: Record<string, number>;
    recentActivity: AuditLogEntry[];
  } {
    const now = Date.now();
    const periodMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[period];

    const startDate = now - periodMs;
    
    const recentLogs = this.getLogs({
      startDate
    });

    const actionsByType: Record<string, number> = {};
    const actionsByResource: Record<string, number> = {};
    const actionsByUser: Record<string, number> = {};

    let successfulActions = 0;
    let failedActions = 0;

    recentLogs.forEach(log => {
      // Count by action type
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      
      // Count by resource
      actionsByResource[log.resource] = (actionsByResource[log.resource] || 0) + 1;
      
      // Count by user
      actionsByUser[log.userId] = (actionsByUser[log.userId] || 0) + 1;
      
      // Count success/failure
      if (log.success) {
        successfulActions++;
      } else {
        failedActions++;
      }
    });

    return {
      totalActions: recentLogs.length,
      successfulActions,
      failedActions,
      actionsByType,
      actionsByResource,
      actionsByUser,
      recentActivity: recentLogs.slice(0, 10) // Last 10 actions
    };
  }

  /**
   * Export audit logs
   */
  exportLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: number;
    endDate?: number;
    success?: boolean;
  }): string {
    const logs = this.getLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clear audit logs
   */
  clearLogs(): void {
    this.auditLog = [];
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const auditLogger = AuditLogger.getInstance();

// Predefined action types for consistency
export const AuditActions = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BULK_DELETE: 'BULK_DELETE',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
  BULK_NOTIFICATION: 'BULK_NOTIFICATION',
  ASSIGN_FINE: 'ASSIGN_FINE',
  WAIVE_FINE: 'WAIVE_FINE',
  CREATE_HOLIDAY: 'CREATE_HOLIDAY',
  DELETE_HOLIDAY: 'DELETE_HOLIDAY',
  CREATE_ASSIGNMENT: 'CREATE_ASSIGNMENT',
  UPDATE_ASSIGNMENT: 'UPDATE_ASSIGNMENT',
  DELETE_ASSIGNMENT: 'DELETE_ASSIGNMENT'
};

// Predefined resource types for consistency
export const AuditResources = {
  STUDENT: 'STUDENT',
  ASSIGNMENT: 'ASSIGNMENT',
  SEMINAR: 'SEMINAR',
  NOTIFICATION: 'NOTIFICATION',
  FINE: 'FINE',
  HOLIDAY: 'HOLIDAY',
  USER: 'USER',
  SYSTEM: 'SYSTEM'
};