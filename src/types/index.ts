/** 与 kube-nova-web 一致的通用 API 包装结构 */
export interface BaseResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}
