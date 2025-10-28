export class SuccessResponse<TData = undefined, TMetaData = undefined> {
  message?: string;
  data?: TData;
  metadata?: TMetaData;
}
