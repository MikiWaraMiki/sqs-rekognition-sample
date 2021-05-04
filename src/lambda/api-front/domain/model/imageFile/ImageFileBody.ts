import { UserInvalidException } from '../../../exception/UserInvalidException'

export class ImageFileBody {
  readonly decodedFile: Buffer
  readonly contentType: string
  readonly extension: string

  constructor(base64String: string) {
    if (!base64String)
      throw UserInvalidException.badRequest('file is required', [
        'ファイルを選択してください',
      ])

    if (!this.isValidBase64(base64String))
      throw UserInvalidException.badRequest('invalid file extension', [
        'ファイルの形式が不正です',
      ])

    const fileData = base64String.replace(/^data:\w+\/\w+;base64,/, '')
    this.decodedFile = Buffer.from(fileData, 'base64')
    this.contentType = this.contentTypeFromBase64(base64String)
    this.extension = this.extensionFromBase64(base64String)
  }

  private isValidBase64(base64String: string): Boolean {
    const fileExtension = this.extensionFromBase64(base64String)

    console.log(fileExtension)
    return /(jpe?g|png|gif)$/i.test(fileExtension)
  }

  private contentTypeFromBase64(base64String: string): string {
    const contentType = base64String
      .toString()
      .slice(base64String.indexOf(':') + 1, base64String.indexOf(';'))

    return contentType
  }

  private extensionFromBase64(base64String: string) {
    return base64String
      .toString()
      .slice(base64String.indexOf('/') + 1, base64String.indexOf(';'))
  }
}
