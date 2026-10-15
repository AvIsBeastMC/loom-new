import chalk from 'chalk';
import type { RequestHandler } from 'express';

const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.once('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500
      ? chalk.red.bold
      : statusCode >= 400
        ? chalk.yellow.bold
        : statusCode >= 300
          ? chalk.cyan.bold
          : chalk.green.bold;
    const outcome = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'OK';

    console.log(
      `${chalk.gray(new Date().toISOString())} ` +
      `${chalk.magenta(req.method.padEnd(7))} ` +
      `${chalk.white(req.path)} ` +
      `${statusColor(`${statusCode} ${outcome}`)} ` +
      `${chalk.gray(`${elapsedMs.toFixed(1)}ms`)}`
    );
  });

  next();
};

export default requestLogger;