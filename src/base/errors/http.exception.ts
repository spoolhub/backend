import { ResponseError } from '../response/response-error';
import { IntrinsicException } from './intrinsic.exception';

export interface HttpExceptionOptions {
  cause?: unknown;
  description?: string;
}

export interface DescriptionAndOptions {
  description?: string;
  httpExceptionOptions?: HttpExceptionOptions;
}

export class HttpException<
  TDetails = undefined,
  TMetaData = undefined,
> extends IntrinsicException {
  public cause: unknown;

  constructor(
    private readonly status: number,
    private response?: ResponseError<TDetails, TMetaData>,
    private readonly options?: HttpExceptionOptions
  ) {
    super();
    if (!this.response) {
      this.response = {};
    }
    this.initMessage();
    this.initName();
    this.initCause();
  }

  /**
   * Configures error chaining support
   *
   * @see https://nodejs.org/en/blog/release/v16.9.0/#error-cause
   * @see https://github.com/microsoft/TypeScript/issues/45167
   */
  protected initCause(): void {
    if (this.options?.cause) {
      this.cause = this.options.cause;
      return;
    }
  }

  protected initMessage() {
    if (!this.response?.message && !this.response?.details) {
      const message =
        this.constructor.name.match(/[A-Z][a-z]+|[0-9]+/g)?.join(' ') ??
        'Error';
      this.response!.message = message;
      this.message = message;
    }
  }

  protected initName(): void {
    this.name = this.constructor.name;
  }

  public getResponse(): ResponseError<TDetails, TMetaData> {
    return this.response as ResponseError<TDetails, TMetaData>;
  }

  public getStatus(): number {
    return this.status;
  }
}
