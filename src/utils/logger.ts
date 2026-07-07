import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private static logFilePath: string = path.join(process.cwd(), 'logs', 'execution.log');

  private static ensureLogDir() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private static writeLog(level: string, message: string) {
    this.ensureLogDir();
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(this.logFilePath, logMessage, 'utf8');
  }

  public static info(message: string) {
    const formatted = `[INFO] ${message}`;
    console.log(formatted);
    this.writeLog('INFO', message);
  }

  public static warn(message: string) {
    const formatted = `\x1b[33m[WARN] ${message}\x1b[0m`;
    console.warn(formatted);
    this.writeLog('WARN', message);
  }

  public static error(message: string, error?: any) {
    let errMsg = message;
    if (error) {
      errMsg += ` - ${error.message || error}`;
      if (error.stack) {
        errMsg += `\nStack: ${error.stack}`;
      }
    }
    const formatted = `\x1b[31m[ERROR] ${errMsg}\x1b[0m`;
    console.error(formatted);
    this.writeLog('ERROR', errMsg);
  }

  public static success(message: string) {
    const formatted = `\x1b[32m[SUCCESS] ${message}\x1b[0m`;
    console.log(formatted);
    this.writeLog('SUCCESS', message);
  }

  public static clearLogFile() {
    this.ensureLogDir();
    if (fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '', 'utf8');
    }
  }
}
