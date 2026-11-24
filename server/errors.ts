/**
 * An error whose message is safe and useful to show a merchant or a customer.
 * Anything else that is thrown is logged and replaced with a generic message.
 */
export class UserError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly field?: string,
  ) {
    super(message);
    this.name = "UserError";
  }
}

export function notFound(what = "That record"): UserError {
  return new UserError(`${what} doesn't exist or has been deleted.`, 404);
}
