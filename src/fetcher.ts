import { ZodSchema, input, object, output, string } from "zod";
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
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD"
  | "CONNECT"
  | "TRACE";

export type EndPoint<
  Params extends ZodSchema,
  RequestBody extends ZodSchema,
  Response extends ZodSchema,
  SearchParams extends ZodSchema
> = {
  HttpMethod: HTTPMethods;
  path: RouteConfig<Params, SearchParams>;
  params: Params;
  body?: RequestBody;
  response: Response;
};

const isMethodWithBody = (
  method: HTTPMethods
): method is HTTPMethodsWithBody => {
  return method === "POST" || method === "PUT" || method === "PATCH";
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
    params,
    body,
    init,
  }: EndPointConfig<Params, SearchParams>) => {
    const parsedBody = endPoint.body ? endPoint.body.parse(body) : undefined;

    try {
      const response = await fetch(endPoint.path(params), {
        method: endPoint.HttpMethod,
        ...(isMethodWithBody(endPoint.HttpMethod)
          ? { body: JSON.stringify(endPoint.body?.parse(body)) }
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
      throw new Error("Server error");
    }
  };
};

export type EndPointConfig<Params extends ZodSchema, Body extends ZodSchema> = {
  /**
   * @name params
   * The parameters for the endpoint
   */
  params: input<Params>;
  /**
   * @name body
   * The body for the endpoint
   */
  body?: input<Body>;
  /**
   * @name init
   * The request init object for the fetch call
   */
  init?: Omit<RequestInit, "body" | "method">;
};
