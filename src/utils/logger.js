const log = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...meta
  };
  const color = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    SUCCESS: '\x1b[32m',
  }[entry.level] || '\x1b[0m';
  console.log(`${color}[${entry.timestamp}] [${entry.level}] ${message}\x1b[0m`, Object.keys(meta).length ? meta : '');
};

module.exports = {
  info: (msg, meta) => log('INFO', msg, meta),
  warn: (msg, meta) => log('WARN', msg, meta),
  error: (msg, meta) => log('ERROR', msg, meta),
  success: (msg, meta) => log('SUCCESS', msg, meta),
};
