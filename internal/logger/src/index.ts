export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const PREFIX = '[bagra]';

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

function noop() {}

function makeLogger(level: LogLevel): Logger {
  const threshold = LOG_LEVELS[level];

  return {
    debug:
      threshold <= LOG_LEVELS.debug
        ? (...args: unknown[]) => console.debug(PREFIX, ...args)
        : noop,
    info:
      threshold <= LOG_LEVELS.info
        ? (...args: unknown[]) => console.info(PREFIX, ...args)
        : noop,
    warn:
      threshold <= LOG_LEVELS.warn
        ? (...args: unknown[]) => console.warn(PREFIX, ...args)
        : noop,
    error:
      threshold <= LOG_LEVELS.error
        ? (...args: unknown[]) => console.error(PREFIX, ...args)
        : noop,
  };
}

/** The shared logger instance. Default level: `'warn'`. */
export let logger: Logger = makeLogger('warn');

/**
 * Set the global log level.
 *
 * Replaces the shared logger instance. All modules importing `logger`
 * see the new level immediately (they hold a reference to the module
 * binding, not the old object).
 *
 * @param level - Minimum log level to output.
 */
export function setLogLevel(level: LogLevel): void {
  logger = makeLogger(level);
}
