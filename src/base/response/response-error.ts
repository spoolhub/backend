export class ResponseError<TDetails = undefined, TMetaData = undefined> {
  message?: string;
  details?: TDetails;
  metadata?: TMetaData;
}
