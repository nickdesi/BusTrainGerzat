/**
 * Structured Logger
 * Provides consistent logging with context, levels, and timestamps
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

/**
 * Get current timestamp in ISO format
 */
const getTimestamp = (): string => new Date().toISOString();

/**
 * Check if we're in development mode
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Format log entry for console output
 */
const formatForConsole = (entry: LogEntry): string => {
    const parts = [
        `[${entry.timestamp}]`,
        `[${entry.level.toUpperCase()}]`,
        `[${entry.service}]`,
        entry.message,
    ];
    return parts.join(' ');
};

/**
 * Create a logger instance for a specific service/module
 */
export function createLogger(service: string) {
    const log = (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
        const entry: LogEntry = {
            timestamp: getTimestamp(),
            level,
            service,
            message,
            context,
        };

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }

        // In development, use colored console output
        if (isDev) {
            const formatted = formatForConsole(entry);
            const contextStr = context ? ` ${JSON.stringify(context)}` : '';

            switch (level) {
                case 'debug':
                    console.debug(`🔍 ${formatted}${contextStr}`);
                    break;
                case 'info':
                    console.info(`ℹ️ ${formatted}${contextStr}`);
                    break;
                case 'warn':
                    console.warn(`⚠️ ${formatted}${contextStr}`);
                    break;
                case 'error':
                    console.error(`❌ ${formatted}${contextStr}`, error || '');
                    break;
            }
        } else {
            // In production, output structured JSON
            // This can be parsed by log aggregators (CloudWatch, Datadog, etc.)
            console.log(JSON.stringify(entry));
        }
    };

    return {
        debug: (message: string, context?: LogContext) => log('debug', message, context),
        info: (message: string, context?: LogContext) => log('info', message, context),
        warn: (message: string, context?: LogContext) => log('warn', message, context),
        error: (message: string, context?: LogContext, error?: Error) => log('error', message, context, error),

        /**
         * Log a performance metric
         */
        metric: (name: string, durationMs: number, context?: LogContext) => {
            log('info', `Metric: ${name}`, { ...context, durationMs, metricName: name });
        },

        /**
         * Create a timer for measuring operation duration
         */
        startTimer: (operationName: string) => {
            const start = performance.now();
            return {
                end: (context?: LogContext) => {
                    const duration = Math.round(performance.now() - start);
                    log('info', `${operationName} completed`, { ...context, durationMs: duration });
                    return duration;
                },
            };
        },
    };
}

// Pre-configured loggers for common services
export const gtfsLogger = createLogger('gtfs-rt');
export const apiLogger = createLogger('api');
export const uiLogger = createLogger('ui');
