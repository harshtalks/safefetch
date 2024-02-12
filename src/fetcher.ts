import * as z from "zod";
import { RouteConfig, createRoute } from "./route.js";

export type EndPoint<
  Params extends z.ZodSchema,
  RequestBody extends z.ZodSchema,
  Response extends z.ZodSchema,
  SearchParams extends z.ZodSchema
> = {
  HttpMethod:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "OPTIONS"
    | "HEAD"
    | "CONNECT"
    | "TRACE";
  path: RouteConfig<Params, SearchParams>;
  params: Params;
  body?: RequestBody;
  response: Response;
};

export const createEndPoint = <
  Params extends z.ZodSchema,
  Body extends z.ZodSchema,
  Response extends z.ZodSchema,
  SearchParams extends z.ZodSchema
>(
  endPoint: EndPoint<Params, Body, Response, SearchParams>
) => {
  return async ({
    params,
    body,
    init,
  }: {
    params: z.input<Params>;
    body?: z.input<Body>;
    init?: Omit<RequestInit, "body" | "method">;
  }) => {
    const parsedBody = endPoint.body && endPoint.body.parse(body);

    try {
      const response = await fetch(endPoint.path(params), {
        method: endPoint.HttpMethod,
        ...(endPoint.HttpMethod === "POST" ||
        endPoint.HttpMethod === "PUT" ||
        endPoint.HttpMethod === "PATCH" ||
        endPoint.HttpMethod === "DELETE"
          ? { body: JSON.stringify(parsedBody) }
          : {}),
        ...init,
      });

      if (!response.ok) {
        throw new Error("Request failed: " + response.statusText);
      }

      const responseData = await response.json();
      const parsedResponseData = endPoint.response.parse(
        responseData
      ) as z.output<Response>;

      return parsedResponseData;
    } catch (err) {
      throw new Error("Server error");
    }
  };
};
