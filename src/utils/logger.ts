/**
 * Logging and Debugging Utilities
 * Implements structured logging with Winston
 * Follows five-step debugging process:
 * 1. Reproduce
 * 2. Localize
 * 3. Analyze
 * 4. Fix
 * 5. Verify
 */

import winston from 'winston';
import path from 'path';

/**
 * Custom log levels
 */
const customLevels = {
   levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
   },
   colors: {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      debug: 'blue',
      trace: 'magenta'
   }
};

winston.addColors(customLevels.colors);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
   levels: customLevels.levels,
   format: winston.format.combine(
      winston.format.timestamp({
         format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
   ),
   defaultMeta: { service: 'chat-application' },
   transports: [
      // Write all logs with level 'error' to error.log
      new winston.transports.File({
         filename: 'logs/error.log',
         level: 'error',
         maxsize: 5242880, // 5MB
         maxFiles: 5
      }),
      // Write all logs to combined.log
      new winston.transports.File({
         filename: 'logs/combined.log',
         maxsize: 5242880, // 5MB
         maxFiles: 5
      })
   ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
   logger.add(new winston.transports.Console({
      format: winston.format.combine(
         winston.format.colorize(),
         winston.format.printf(
            info => `${info.timestamp} ${info.level}: ${info.message}`
         )
      )
   }));
}

/**
 * Assertion utility for debugging
 * @param condition - Condition to check
 * @param message - Error message if assertion fails
 */
export function assert(condition: boolean, message: string): void {
   if (!condition) {
      logger.error(`Assertion failed: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
   }
}

/**
 * Debugging context for reproducing bugs
 */
export interface DebugContext {
   timestamp: number;
   operation: string;
   input: any;
   output?: any;
   error?: Error;
   stackTrace?: string;
}

/**
 * Debug session recorder
 * Helps reproduce bugs by recording execution context
 */
class DebugRecorder {
   private sessions: Map<string, DebugContext[]>;
   private maxSessionSize: number = 100;

   constructor() {
      this.sessions = new Map();
   }

   /**
    * Start a new debug session
    */
   public startSession(sessionId: string): void {
      this.sessions.set(sessionId, []);
      logger.debug(`Debug session started: ${sessionId}`);
   }

   /**
    * Record a debug context
    */
   public record(sessionId: string, context: DebugContext): void {
      let session = this.sessions.get(sessionId);
      if (!session) {
         session = [];
         this.sessions.set(sessionId, session);
      }

      session.push(context);

      // Limit session size
      if (session.length > this.maxSessionSize) {
         session.shift();
      }

      logger.debug(`Debug context recorded for session ${sessionId}`, context);
   }

   /**
    * Get session history
    */
   public getSession(sessionId: string): DebugContext[] | undefined {
      return this.sessions.get(sessionId);
   }

   /**
    * End and export session
    */
   public endSession(sessionId: string): DebugContext[] | undefined {
      const session = this.sessions.get(sessionId);
      this.sessions.delete(sessionId);
      logger.debug(`Debug session ended: ${sessionId}`);
      return session;
   }

   /**
    * Clear all sessions
    */
   public clearAll(): void {
      this.sessions.clear();
   }
}

/**
 * Performance monitor for identifying bottlenecks
 */
export class PerformanceMonitor {
   private operations: Map<string, number[]>;

   constructor() {
      this.operations = new Map();
   }

   /**
    * Start timing an operation
    */
   public start(operationName: string): () => void {
      const startTime = Date.now();

      return () => {
         const duration = Date.now() - startTime;
         this.record(operationName, duration);
      };
   }

   /**
    * Record operation duration
    */
   private record(operationName: string, duration: number): void {
      if (!this.operations.has(operationName)) {
         this.operations.set(operationName, []);
      }

      const durations = this.operations.get(operationName)!;
      durations.push(duration);

      // Keep only last 100 measurements
      if (durations.length > 100) {
         durations.shift();
      }

      logger.debug(`Performance: ${operationName} took ${duration}ms`);
   }

   /**
    * Get statistics for an operation
    */
   public getStats(operationName: string): {
      count: number;
      avg: number;
      min: number;
      max: number;
   } | null {
      const durations = this.operations.get(operationName);
      if (!durations || durations.length === 0) {
         return null;
      }

      const count = durations.length;
      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      return { count, avg, min, max };
   }

   /**
    * Log performance report
    */
   public report(): void {
      logger.info('=== Performance Report ===');
      for (const [operation, durations] of this.operations) {
         const stats = this.getStats(operation);
         if (stats) {
            logger.info(
               `${operation}: avg=${stats.avg.toFixed(2)}ms, ` +
               `min=${stats.min}ms, max=${stats.max}ms, count=${stats.count}`
            );
         }
      }
   }
}

// Export instances
export const debugRecorder = new DebugRecorder();
export const perfMonitor = new PerformanceMonitor();
export default logger;
