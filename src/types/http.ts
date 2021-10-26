import type {
  Context as AzureContext,
  HttpRequest as AzureHttpRequest,
  Logger as AzureLogger,
} from '@azure/functions';
import type {
  APIGatewayEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  APIGatewayProxyStructuredResultV2,
  Context as AwsContext,
} from 'aws-lambda';
import { NoResponse, Update, UpdateResponse } from './telegram';

export type {
  APIGatewayEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  APIGatewayProxyStructuredResultV2,
  AwsContext,
  AzureContext,
  AzureHttpRequest,
  AzureLogger,
};

export type Logger = Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;

export type Context = AwsContext | AzureContext;

export type BodyHandler<C extends Context = Context> = (
  body: unknown,
  ctx: C,
) => UpdateResponse | Promise<UpdateResponse>;

export interface AzureHttpResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
}

export type AzureHttpFunction = (
  ctx: AzureContext,
  req: AzureHttpRequest,
) => Promise<AzureHttpResponse | undefined> | AzureHttpResponse | undefined;

export type AwsHttpRequest = APIGatewayEvent | APIGatewayProxyEventV2;
export type AwsHttpResponse =
  | APIGatewayProxyResult
  | APIGatewayProxyStructuredResultV2;

export type AwsHttpFunction = (
  event: AwsHttpRequest,
  ctx: AwsContext,
) => Promise<AwsHttpResponse>;

// export type AwsHttpFunction = APIGatewayProxyHandler | APIGatewayProxyHandlerV2;

export type Fn = (...args: any[]) => any;
export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

export interface Adapter<F extends Fn, C extends Context = Context> {
  encodeArgs(body: Update | NoResponse, ctx: C): Parameters<F>;
  decodeArgs(...args: Parameters<F>): [body: Update | NoResponse, ctx: C];
  encodeResponse(
    updateResponse: UpdateResponse,
    ctx: C,
  ): Awaited<ReturnType<F>>;
  decodeResponse(res: Awaited<ReturnType<F>>): UpdateResponse;
}
