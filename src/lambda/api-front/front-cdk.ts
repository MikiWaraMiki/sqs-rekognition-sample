import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { S3, SQS } from 'aws-sdk'
import { createLambdaLogger } from '../shared/logger'
import { ImageFile } from './domain/model/imageFile/ImageFile'
import { ImageFileBody } from './domain/model/imageFile/ImageFileBody'
import { ImageFileName } from './domain/model/imageFile/ImageFileName'
import { InternalSeverException } from './exception/InternalServerException'
import { UserInvalidException } from './exception/UserInvalidException'

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  const logger = createLambdaLogger()
  try {
    logger.log({
      level: 'info',
      message: 'request is received',
      params: event,
    })

    if (!event.body) {
      logger.log({
        level: 'warn',
        message: 'request is not include body',
      })
      throw UserInvalidException.badRequest('invalid parameters', [
        'リクエストが不正です',
      ])
    }

    const body = JSON.parse(event.body)
    const fileName = new ImageFileName(body.fileName)
    const fileBody = new ImageFileBody(body.imageBase64)
    const file = new ImageFile(fileName, fileBody)

    const s3Client = new S3()
    const sqsClient = new SQS()

    const key = `uploads/${file.id}/${file.name()}`
    const params: S3.PutObjectRequest = {
      Body: file.body(),
      Bucket: process.env.BUCKET_NAME ?? '',
      Key: key,
      ContentType: file.contentType(),
    }

    logger.log({
      level: 'info',
      message: 'uploading file to s3',
      params: params,
    })
    await s3Client.putObject(params).promise()
    logger.log({
      level: 'info',
      message: 'uploaded file to s3',
    })

    // NOTE: SQSにメッセージング
    const queueMessage = {
      s3FilePath: key,
      uuid: file.id,
    }
    logger.log({
      level: 'info',
      message: 'sending message to sqs',
      params: queueMessage,
    })
    const sendMessage = await sqsClient
      .sendMessage({
        MessageBody: JSON.stringify(queueMessage),
        QueueUrl: process.env.QUEUE_URL ?? '',
      })
      .promise()

    logger.log({
      level: 'info',
      message: 'sended message to sqs',
      response: sendMessage,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'accepted request',
      }),
    }
  } catch (e) {
    const exception = (e as Error).message
    logger.log({
      level: 'error',
      message: 'error is happened',
      exception,
    })

    if (e instanceof UserInvalidException) {
      return {
        statusCode: e.statusCode,
        body: JSON.stringify({
          errors: e.displayErrors,
          message: e.message,
        }),
      }
    }

    const error = new InternalSeverException((e as Error).message)

    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        message: error.message,
      }),
    }
  }
}
