import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import logger from './logger.ts';

const emitter = new EventEmitter();
const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
// let counter = 0;

function generateRandomLog() {
    const randomNumber = randomUUID();
    const baseLog = {
        serviceName: 'PaymentService',
        transactionId: randomNumber,
        userId: 'USR-' + Math.floor(Math.random() * 10000),
        orderId: 'ORD-' + Math.floor(Math.random() * 100000),
        amount: (Math.random() * 5000 + 100).toFixed(2),
        paymentMode: ['UPI', 'CreditCard', 'NetBanking'][
            Math.floor(Math.random() * 3)
        ],
        timestamp: new Date().toISOString(),
    };

    // Randomly pick a log level
    const levels = ['info', 'warn', 'error'];
    const level = levels[Math.floor(Math.random() * levels.length)];

    if (level === 'info') {
        const logData = {
            ...baseLog,
            level: 'info',
            message: 'User purchase processed successfully',
            status: 'SUCCESS',
        };
        logger.info(logData);
        return logData;
    } else if (level === 'warn') {
        const logData = {
            ...baseLog,
            level: 'warn',
            message:
                'User purchase processed with warnings: verification delayed',
            status: 'PENDING',
            warningDetail:
                'Transaction verification is taking longer than expected',
        };
        logger.warn(logData);
        return logData;
    } else {
        // error
        const logData = {
            ...baseLog,
            level: 'error',
            message: 'User purchase failed due to payment gateway error',
            status: 'ERROR',
            errorDetail: 'Gateway timeout or rejected transaction',
        };
        logger.error(logData);
        return logData;
    }
}

app.get('/emit-event', (req: Request, res: Response) => {
    try {
        const logEntry = generateRandomLog();
        res.json(logEntry);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

app.get('/event-stream', (req: Request, res: Response) => {
    try {
        // Set the header
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write('data: connected to server\n\n');

        // Stimulating update from server to client
        // const intervalId = setInterval(() => {
        //     counter++;
        //     res.write(`data: Event no.${counter}\n\n`);
        // }, 2000);

        // emitter.on('emit-log', (arg) => {
        //     res.write(`data: event no.${arg.randomNumber}\n\n`);
        // });

        const filePath = path.join(__dirname, 'logs/combined.log');
        function sendExistingLogs() {
            try {
                if (fs.statSync(filePath)) {
                    const initialData = fs.readFileSync(filePath, 'utf-8');
                    const lines = initialData
                        .split('\n')
                        .filter((line) => line.trim());
                    lines.forEach((line) => {
                        res.write(`data: ${line}\n\n`);
                    });
                } else {
                    res.write('data: {"info": "No previous logs found"}\n\n');
                }
            } catch (error) {
                if (error instanceof Error) {
                    logger.error(error.message);
                }
            }
        }
        sendExistingLogs();
        // Get the initial file size
        let lastSize = 0;
        try {
            const stats = fs.statSync(filePath);
            lastSize = stats.size;
        } catch (error) {
            console.log("Currently log file doesn't exist");
        }

        let fileWatcher = fs.watch(filePath, (eventType) => {
            if (eventType === 'change') {
                try {
                    const stats = fs.statSync(filePath);
                    const currentSize = stats.size;
                    if (currentSize > lastSize) {
                        const stream = fs.createReadStream(filePath, {
                            start: lastSize,
                            end: currentSize - 1,
                        });
                        let newContent = '';

                        stream.on('data', (chunk) => {
                            newContent += chunk.toString();
                        });

                        stream.on('end', () => {
                            const newLines = newContent
                                .split('\n')
                                .filter((line) => !!line.trim());
                            newLines.forEach((line) => {
                                res.write(`data: ${line}\n\n`);
                            });
                        });
                        lastSize = currentSize;
                    }
                } catch (error) {
                    console.error('Error reading log file:', error);
                    if (error instanceof Error) {
                        logger.error(error.message);
                    }
                }
            }
        });

        // Stop sending updated when client close the connection
        req.on('close', () => {
            console.log('Connection Closed');
            fileWatcher.close();
            // clearInterval(intervalId);
            res.end();
        });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json(`Error:${error.message}`);
        }
    }
});

app.listen(PORT, (err) => {
    if (err) {
        process.exit(1);
    }
    console.log(`Server listening on PORT: ${PORT}`);
});
