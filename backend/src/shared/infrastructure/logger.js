import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "catalog" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "product.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

export const logEvent = (event, payload = {}) => {
  const entry = {
    event,
    ts: new Date().toISOString(),
    ...payload,
  };

  logger.info(JSON.stringify(entry));
};

export default logger;

