import { ImageFileBody } from './ImageFileBody'
import { ImageFileName } from './ImageFileName'
import { v4 as uuid4 } from 'uuid'
export class ImageFile {
  readonly id: string
  private readonly fileName: ImageFileName
  private readonly fileBody: ImageFileBody

  constructor(fileName: ImageFileName, fileBody: ImageFileBody) {
    this.id = uuid4()
    this.fileName = fileName
    this.fileBody = fileBody
  }

  body() {
    return this.fileBody.decodedFile
  }
  name() {
    return this.fileName.name
  }

  contentType() {
    return this.fileBody.contentType
  }

  fileExtension() {
    return this.fileBody.extension
  }
}
