import * as winston from 'winston'

const createLambdaLogger = (): winston.Logger => {
  const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  const logger = winston.createLogger({
    level: level,
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: { service: 'winston-lambda' },
    transports: new winston.transports.Console(),
  })
  return logger
}

export { createLambdaLogger }
