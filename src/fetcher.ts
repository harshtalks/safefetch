import {
  ZodError,
  ZodSchema,
  input,
  number,
  object,
  output,
  string,
} from "zod";
import { RouteConfig, createRoute } from "./route.js";

export type HttpMethods = HttpMethodsWithBody | HttpMethodsWithoutBody;

export type HttpMethodsWithBody = "POST" | "PUT" | "PATCH";

export type HttpMethodsWithoutBody =
  | "GET"
  | "DELETE"
  | "OPTIONS"
  | "HEAD"
  | "CONNECT"
  | "TRACE"
  | "GET"
  | "DELETE"
  | "OPTIONS"
  | "HEAD"
  | "CONNECT"
  | "TRACE";

export type EndPoint<
  Params extends ZodSchema,
  RequestBody extends ZodSchema,
  SearchParams extends ZodSchema,
  Response extends ZodSchema,
  Methods extends HttpMethods = HttpMethods
> = {
  path: RouteConfig<Params, SearchParams>;
  response: Response;
} & (Methods extends HttpMethodsWithBody
  ? {
      httpMethod: HttpMethodsWithBody;
      body: RequestBody;
    }
  : {
      httpMethod: HttpMethodsWithoutBody;
    });

/**
 * @name isHttpMethodWithBody
 * @description checks if the endpoint has a body, currently we only check for the POST, PUT and PATCH methods
 * @param endPoint
 * @returns
 */

export const isHttpMethodWithBody = <
  Params extends ZodSchema,
  RequestBody extends ZodSchema,
  SearchParams extends ZodSchema,
  Response extends ZodSchema
>(
  endPoint: EndPoint<Params, RequestBody, SearchParams, Response>
): endPoint is EndPoint<
  Params,
  RequestBody,
  SearchParams,
  Response,
  HttpMethodsWithBody
> => {
  return (
    endPoint.httpMethod === "POST" ||
    endPoint.httpMethod === "PUT" ||
    endPoint.httpMethod === "PATCH"
  );
};

/**
 * @param endPoint
 * @description creates an endpoint for the fetcher
 * @returns a function that takes in the request config and the parameters for the endpoint
 */

export const createEndPoint = <
  Params extends ZodSchema,
  Body extends ZodSchema,
  SearchParams extends ZodSchema,
  Response extends ZodSchema
>(
  endPoint: EndPoint<Params, Body, SearchParams, Response>,
  {
    customHandler,
  }: {
    customHandler?: (
      config: EndPointConfig<Params, Body, typeof endPoint.httpMethod>
    ) => Promise<output<Response>>;
  }
) => {
  return async ({
    requestConfig,
    params,
    body,
  }: EndPointConfig<Params, Body, typeof endPoint.httpMethod>) => {
    try {
      if (customHandler) {
        return customHandler({ requestConfig, params, body });
      }

      const response = await fetch(endPoint.path(params), {
        method: endPoint.httpMethod,
        ...(isHttpMethodWithBody(endPoint) && body
          ? { body: JSON.stringify(endPoint.body.parse(body)) }
          : {}),
        ...requestConfig,
      });

      // account for the other errors as well, i
      if (response.status >= 400 && response.status < 499) {
        throw new Error(
          "Request failed with client error: " + response.statusText
        );
      } else if (response.status >= 500 && response.status < 599) {
        throw new Error(
          "Request failed with server error: " + response.statusText
        );
      }

      const responseData = await response.json();

      const parsedResponseData = endPoint.response.parse(
        responseData
      ) as output<Response>;

      return parsedResponseData;
    } catch (err) {
      if (err instanceof ZodError) throw new Error(err.message);
      else if (err instanceof Error) {
        throw new Error(err.message);
      } else {
        throw new Error("An unknown error occured. Please try again later.");
      }
    }
  };
};

export type EndPointConfig<
  Params extends ZodSchema,
  Body extends ZodSchema,
  HttpMethod extends HttpMethods = HttpMethods
> = {
  /**
   * @name params
   * The parameters for the endpoint
   */
  params: input<Params>;
  /**
   * @name requestConfig
   * The request init object for the fetch call
   */
  requestConfig?: Omit<RequestInit, "body" | "method">;
} & (HttpMethod extends HttpMethodsWithBody
  ? { body: input<Body> }
  : {
      body?: never;
    });
