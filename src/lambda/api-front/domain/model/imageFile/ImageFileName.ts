import { UserInvalidException } from '../../../exception/UserInvalidException'

export class ImageFileName {
  readonly name: string

  constructor(name: string) {
    if (!name)
      throw UserInvalidException.badRequest('image file name is required', [
        'ファイル名が定義されていません',
      ])

    if (!this.isValidExtension(name))
      throw UserInvalidException.badRequest('invalid file extension', [
        'ファイルの拡張子が不正です',
      ])
    this.name = name
  }

  /**
   * ファイル名の拡張子が許可されているものか検証する
   * @param name
   * @returns
   */
  private isValidExtension(name: string): boolean {
    return /\.(jpe?g|png|gif)$/i.test(name)
  }
}
