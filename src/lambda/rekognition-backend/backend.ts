import { SQSEvent, SQSHandler } from 'aws-lambda'
import { Rekognition, S3 } from 'aws-sdk'
import { createLambdaLogger } from '../shared/logger'

/**
 * SQSからメッセージを受信して、Rekognitionの解析をかける
 * @param event
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  const rekognitionClient = new Rekognition()
  const s3Client = new S3()
  const logger = createLambdaLogger()
  try {
    logger.log({
      level: 'info',
      message: 'event received',
      params: event,
    })

    const rawRecords = event.Records[0]
    const parsedJsonBody = JSON.parse(rawRecords.body)

    const s3ObjectPath: string = parsedJsonBody.s3FilePath
    const uuid: string = parsedJsonBody.uuid

    if (!s3ObjectPath) {
      logger.log({
        level: 'warn',
        message: 'message is not include s3ObjectPath',
        params: parsedJsonBody,
      })
      throw new Error('message is not include s3ObjectPath')
    }

    if (!uuid) {
      logger.log({
        level: 'warn',
        message: 'message is not include uuid',
        params: parsedJsonBody,
      })
      throw new Error('message is not include uuid')
    }

    // NOTE: rekognitionのProcessが失敗した場合でも例外は発生させない
    // Label付与
    try {
      logger.log({
        level: 'info',
        message: 'starting rekognition detect label process',
      })
      const rekognitionLabelParams: Rekognition.DetectLabelsRequest = {
        Image: {
          S3Object: {
            Bucket: process.env.BUCKET_NAME ?? '',
            Name: s3ObjectPath,
          },
        },
        MaxLabels: 10,
        MinConfidence: 1,
      }

      const detectLabelResponse = await rekognitionClient
        .detectLabels(rekognitionLabelParams)
        .promise()

      logger.log({
        level: 'info',
        message: 'rekognition detect label process is success',
        response: detectLabelResponse,
      })

      const resultObjectPath = `uploads/${uuid}/detect-label-result.json`
      const putObjectParams: S3.PutObjectRequest = {
        Body: JSON.stringify(detectLabelResponse.Labels, null, 2),
        Bucket: process.env.BUCKET_NAME ?? '',
        Key: resultObjectPath,
      }
      await s3Client.putObject(putObjectParams).promise()
    } catch (e) {
      logger.log({
        level: 'warn',
        message: 'rekognition detect label process is failed',
        exception: (e as Error).message,
      })
    }

    // 顔検出
    try {
      logger.log({
        level: 'info',
        message: 'starting rekognition detect face process',
      })
      const rekognitionDetectFaceParams: Rekognition.DetectFacesRequest = {
        Image: {
          S3Object: {
            Bucket: process.env.BUCKET_NAME ?? '',
            Name: s3ObjectPath,
          },
        },
        Attributes: ['ALL'],
      }

      const detectFaceResponse = await rekognitionClient
        .detectFaces(rekognitionDetectFaceParams)
        .promise()

      logger.log({
        level: 'info',
        message: 'rekognition detect face process is success',
        response: detectFaceResponse,
      })

      const resultObjectPath = `uploads/${uuid}/detect-face-result.json`
      const putObjectParams: S3.PutObjectRequest = {
        Body: JSON.stringify(detectFaceResponse.FaceDetails, null, 2),
        Bucket: process.env.BUCKET_NAME ?? '',
        Key: resultObjectPath,
      }
      await s3Client.putObject(putObjectParams).promise()
    } catch (e) {
      logger.log({
        level: 'warn',
        message: 'rekognition detect face process failed',
        exception: (e as Error).message,
      })
    }

    logger.log({
      level: 'info',
      message: 'success process',
    })
  } catch (e) {
    logger.log({
      level: 'error',
      message: 'unexpected error',
      exception: (e as Error).message,
    })
  }
}
