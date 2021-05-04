export class InternalSeverException extends Error {
  readonly statusCode = 500
  constructor(exception: string) {
    super(exception)
  }
}
