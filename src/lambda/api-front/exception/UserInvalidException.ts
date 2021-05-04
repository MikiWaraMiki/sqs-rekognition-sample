export class UserInvalidException extends Error {
  readonly statusCode: number
  readonly displayErrors: string[]
  private constructor(
    exception: string,
    displayErrors: string[],
    statusCode: number,
  ) {
    super(exception)

    if (!(statusCode >= 400 && statusCode < 500)) {
      throw new Error('invalid status code. user invalid exception 400~499')
    }

    if (displayErrors.length < 1) {
      throw new Error('display error is must be more than 1')
    }

    this.statusCode = statusCode
    this.displayErrors = displayErrors
  }

  static badRequest(exception: string, displayErrors: string[]) {
    return new UserInvalidException(exception, displayErrors, 400)
  }

  static notFound(exception: string) {
    const displayErrors = ['Not Found']
    return new UserInvalidException(exception, displayErrors, 404)
  }
}
