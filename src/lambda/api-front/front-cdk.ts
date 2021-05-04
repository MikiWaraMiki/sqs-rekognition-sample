import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { S3, SQS } from 'aws-sdk'
import { ImageFile } from './domain/model/imageFile/ImageFile'
import { ImageFileBody } from './domain/model/imageFile/ImageFileBody'
import { ImageFileName } from './domain/model/imageFile/ImageFileName'
import { InternalSeverException } from './exception/InternalServerException'
import { UserInvalidException } from './exception/UserInvalidException'

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  try {
    console.log('event received')
    console.log(event)
    if (!event.body) {
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
    await s3Client.putObject(params).promise()
    console.log('uploaded file')

    // NOTE: SQSにメッセージング
    const queueMessage = {
      s3FilePath: key,
      uuid: file.id,
    }
    const sendMessage = await sqsClient
      .sendMessage({
        MessageBody: JSON.stringify(queueMessage),
        QueueUrl: process.env.QUEUE_URL ?? '',
      })
      .promise()

    console.log('success send message')
    console.log(sendMessage)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'accepted request',
      }),
    }
  } catch (e) {
    console.error((e as Error).message)

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
