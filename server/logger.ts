import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    defaultMeta: { serviceName: 'Realtime log streaming service' },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            dirname: 'logs',
            filename: 'combined.log',
            level: 'info',
            silent: false,
        }),
        new winston.transports.File({
            dirname: 'logs',
            filename: 'error.log',
            level: 'error',
            silent: false,
        }),
        new winston.transports.Console({
            level: 'info',
            silent: false,
        }),
    ],
});

export default logger;
