import {
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from "next/navigation.js";
import queryString from "query-string";
import { ZodSchema, input, object, output, string } from "zod";
import { convertURLSearchParamsToObject } from "./utils.js";

export type RouteConfig<
  TParams extends ZodSchema,
  TSearchParams extends ZodSchema
> = {
  (p: input<TParams>, options?: { search?: input<TSearchParams> }): string;
  useParams: () => output<TParams>;
  useSearchParams: () => output<TSearchParams>;
  params: output<TParams>;
  searchParams: output<TSearchParams>;
};

const routeBuilder = () => {
  const routes: Record<string, RouteConfig<any, any>> = {};

  const urlSchema = string().min(1).url();

  const buildRoute = <
    TParams extends ZodSchema,
    TSearchParams extends ZodSchema
  >(
    name: string,
    fn: (params: input<TParams>) => string,
    paramSchema: TParams = {} as TParams,
    searchSchema: TSearchParams = {} as TSearchParams,
    urlOptions:
      | {
          internal: true;
        }
      | {
          internal: false;
          baseUrl: string;
        }
  ): RouteConfig<TParams, TSearchParams> => {
    // check if the route already exists
    if (routes[name]) {
      throw new Error(`Route with name ${name} already exists`);
    }

    const route: RouteConfig<TParams, TSearchParams> = (params, options) => {
      let route = fn(params);

      if (!urlOptions.internal) {
        const baseUrl = new URL(urlSchema.parse(urlOptions.baseUrl));
        route = new URL(route, baseUrl).toString();
      }

      const searchQuery =
        options?.search && queryString.stringify(options.search);

      return [route, searchQuery ? `?${searchQuery}` : ``].join(``);
    };

    routes[name] = route;

    route.useParams = (): output<TParams> => {
      const routeName =
        Object.entries(routes).find(([key, value]) => value === route)?.[0] ||
        ("Invalid Route" as never);

      const result = paramSchema.safeParse(useNextParams());

      if (!result.success) {
        throw new Error(
          `Invalid params for route ${routeName}: ${result.error}`
        );
      }

      return result.data;
    };

    route.useSearchParams = (): output<TSearchParams> => {
      const routeName =
        Object.entries(routes).find(([key, value]) => value === route)?.[0] ||
        ("Invalid Route" as never);

      const result = searchSchema.safeParse(
        convertURLSearchParamsToObject(useNextSearchParams())
      );

      if (!result.success) {
        throw new Error(
          `Invalid search params for route ${routeName}: ${result.error}`
        );
      }

      return result.data;
    };

    route.params = undefined as output<TParams>;
    route.searchParams = undefined as output<TSearchParams>;

    Object.defineProperty(routeBuilder, "params", {
      get() {
        throw new Error(
          "Routes.[route].params is only for type usage, not runtime. Use it like `typeof Routes.[routes].params`"
        );
      },
    });

    Object.defineProperty(routeBuilder, "searchParams", {
      get() {
        throw new Error(
          "Routes.[route].searchParams is only for type usage, not runtime. Use it like `typeof Routes.[routes].searchParams`"
        );
      },
    });

    return route;
  };

  return buildRoute;
};

const buildRoute = routeBuilder();

export const createRoute = <
  TParams extends ZodSchema,
  TSearchParams extends ZodSchema
>({
  name,
  fn,
  paramsSchema,
  searchParamsSchema,
  options,
}: CreateRouteConfig<TParams, TSearchParams>) => {
  return buildRoute(name, fn, paramsSchema, searchParamsSchema, options);
};

export type CreateRouteConfig<
  UrlParams extends ZodSchema,
  SearchParams extends ZodSchema
> = {
  name: string;
  fn: (params: input<UrlParams>) => string;
  paramsSchema: UrlParams;
  searchParamsSchema?: SearchParams;
  options:
    | {
        internal: true;
      }
    | {
        internal: false;
        baseUrl: string;
      };
};
