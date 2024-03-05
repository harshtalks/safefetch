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

type HTTPMethods = HTTPMethodsWithBody | HTTPMethodsWithoutBody;

type HTTPMethodsWithBody = "POST" | "PUT" | "PATCH";

type HTTPMethodsWithoutBody =
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
  Response extends ZodSchema,
  SearchParams extends ZodSchema,
  Methods extends HTTPMethods = HTTPMethods
> = {
  path: RouteConfig<Params, SearchParams>;
  response: Response;
} & (Methods extends HTTPMethodsWithBody
  ? {
      HttpMethod: HTTPMethodsWithBody;
      body: RequestBody;
    }
  : {
      HttpMethod: HTTPMethodsWithoutBody;
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
  Response extends ZodSchema,
  SearchParams extends ZodSchema
>(
  endPoint: EndPoint<Params, RequestBody, Response, SearchParams>
): endPoint is EndPoint<
  Params,
  RequestBody,
  Response,
  SearchParams,
  HTTPMethodsWithBody
> => {
  return (
    endPoint.HttpMethod === "POST" ||
    endPoint.HttpMethod === "PUT" ||
    endPoint.HttpMethod === "PATCH"
  );
};

export const createEndPoint = <
  Params extends ZodSchema,
  Body extends ZodSchema,
  Response extends ZodSchema,
  SearchParams extends ZodSchema
>(
  endPoint: EndPoint<Params, Body, Response, SearchParams>
) => {
  return async ({
    init,
    params,
    body,
  }: EndPointConfig<Params, Body, typeof endPoint.HttpMethod>) => {
    try {
      const response = await fetch(endPoint.path(params), {
        method: endPoint.HttpMethod,
        ...(isHttpMethodWithBody(endPoint) && body
          ? { body: JSON.stringify(endPoint.body.parse(body)) }
          : {}),
        ...init,
      });

      if (!response.ok) {
        throw new Error("Request failed: " + response.statusText);
      }

      const responseData = await response.json();
      const parsedResponseData = endPoint.response.parse(
        responseData
      ) as output<Response>;

      return parsedResponseData;
    } catch (err) {
      if (err instanceof ZodError) throw new Error(err.message);
      else throw new Error("Request failed");
    }
  };
};

export type EndPointConfig<
  Params extends ZodSchema,
  Body extends ZodSchema,
  HTTPMethod extends HTTPMethods = HTTPMethods
> = {
  /**
   * @name params
   * The parameters for the endpoint
   */
  params: input<Params>;
  /**
   * @name init
   * The request init object for the fetch call
   */
  init?: Omit<RequestInit, "body" | "method">;
} & (HTTPMethod extends HTTPMethodsWithBody
  ? { body: input<Body> }
  : { body: never });

// example

const x = createEndPoint({
  HttpMethod: "POST",
  path: createRoute({
    fn: () => "/",
    name: "/",
    options: {
      internal: true,
    },
    paramsSchema: object({}),
  }),
  body: object({ name: string() }),
  response: object({ id: number() }),
});
