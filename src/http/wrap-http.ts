import { Context } from '..';
import type { Adapter, BodyHandler, Fn } from '../types';

export const wrapHttp =
  <F extends Fn, C extends Context = Context>(
    handler: BodyHandler<C>,
    adpater: Adapter<F, C>,
  ) =>
  async (...args: Parameters<F>) => {
    const [update, ctx] = adpater.decodeArgs(...args);
    return adpater.encodeResponse(update && (await handler(update, ctx)), ctx);
  };

export default wrapHttp;

// export const wrapAzure = (handler: BodyHandler): AzureHttpFunction =>
//   wrapHttp<AzureHttpFunction>(handler, azureAdapter);

// // will work with both V1 and V2 payload format versions
// export const wrapAws = (handler: BodyHandler): AwsHttpFunction =>
//   wrapHttp(handler, awsAdapter);
