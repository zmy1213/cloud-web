/** HTTP / 业务状态码常量（与 kube-nova-web 对齐，error 模块会用到扩展项） */
export const ApiStatus = {
  success: 0,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  error: 400,
  requestTimeout: 408,
  internalServerError: 500,
  badGateway: 502,
  serviceUnavailable: 503,
  gatewayTimeout: 504
} as const;

export type ApiStatusType = (typeof ApiStatus)[keyof typeof ApiStatus];
