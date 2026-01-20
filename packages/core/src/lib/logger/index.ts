/**
 * Structured logging system with context support
 * Provides consistent logging across the application with request tracking
 */

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any, data?: any): void;
  child(context: LogContext): Logger;
}

interface LoggerImpl extends Logger {
  context: LogContext;
  level: LogLevel;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: any;
}

class ConsoleLogger implements Logger {
  private impl: LoggerImpl;

  constructor(context: LogContext = {}, level: LogLevel = 'info') {
    this.impl = {
      context,
      level,
      debug: this.debug.bind(this),
      info: this.info.bind(this),
      warn: this.warn.bind(this),
      error: this.error.bind(this),
      child: this.child.bind(this),
    };
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any, data?: any): void {
    this.log('error', message, data, error);
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger({ ...this.impl.context, ...context }, this.impl.level);
  }

  private log(level: LogLevel, message: string, data?: any, error?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.impl.context,
      data,
    };

    const formattedMessage = this.formatMessage(entry);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        if (error) {
          console.error(this.formatError(error));
        }
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.impl.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const parts = [entry.timestamp, `[${entry.level.toUpperCase()}]`];
    
    if (entry.context.requestId) {
      parts.push(`[${entry.context.requestId}]`);
    }
    
    parts.push(entry.message);
    
    if (Object.keys(entry.context).length > 0 && !entry.context.requestId) {
      parts.push(JSON.stringify(entry.context));
    }
    
    if (entry.data) {
      parts.push(JSON.stringify(entry.data));
    }
    
    return parts.join(' ');
  }

  private formatError(error: any): string {
    if (error instanceof Error) {
      return `Error: ${error.message}\nStack: ${error.stack}`;
    }
    return `Error: ${JSON.stringify(error)}`;
  }
}

/**
 * Create a new logger instance with optional initial context
 * 
 * @param context Initial context to attach to all log entries
 * @returns Logger instance
 */
export function createLogger(context: LogContext = {}): Logger {
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  return new ConsoleLogger(context, logLevel);
}

/**
 * Create a logger with request context
 * 
 * @param requestId Unique request identifier
 * @param additionalContext Additional context to include
 * @returns Logger with request context
 */
export function createRequestLogger(requestId: string, additionalContext: LogContext = {}): Logger {
  return createLogger({
    requestId,
    ...additionalContext,
  });
}

/**
 * Create a child logger with additional context
 * 
 * @param parent Parent logger instance
 * @param context Additional context to merge
 * @returns Child logger instance
 */
export function createChildLogger(parent: Logger, context: LogContext): Logger {
  return parent.child(context);
}