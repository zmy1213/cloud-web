import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { ElMessageBox } from "element-plus";
import { useUserStore } from "@/store/modules/user";
import { ApiStatus } from "./status";
import { HttpError, showError, showSuccess } from "./error";
import type { BaseResponse } from "@/types";
import { router } from "@/router";

const REQUEST_TIMEOUT = 15000;
const LOGOUT_DELAY = 500;
const MAX_RETRIES = 0;
const RETRY_DELAY = 1000;
const UNAUTHORIZED_DEBOUNCE_TIME = 3000;

const BUSINESS_CODE = {
  SUCCESS: 0,
  UNAUTHORIZED: 401,
  NEED_RESET_PASSWORD: 101112
} as const;

const TOKEN_ERROR_CODES = {
  100091: "令牌不能为空",
  100092: "无效的令牌",
  100093: "令牌已过期",
  100094: "令牌已被使用，请重新登录",
  100095: "无效的签名算法",
  100096: "令牌格式错误",
  100097: "令牌尚未生效",
  100098: "令牌声明无效",
  100002: "登录失败，请重新登录"
} as const;

let isTokenErrorShown = false;
let tokenErrorTimer: ReturnType<typeof setTimeout> | null = null;

let isUnauthorizedErrorShown = false;
let unauthorizedTimer: ReturnType<typeof setTimeout> | null = null;

interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean;
  showSuccessMessage?: boolean;
}

class ExtendedHttpError extends HttpError {
  isErrorShown = false;
}

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const withCredentials = import.meta.env.VITE_WITH_CREDENTIALS === "true";

const axiosInstance = axios.create({
  timeout: REQUEST_TIMEOUT,
  baseURL,
  withCredentials,
  validateStatus: (status) => status >= 200 && status < 300,
  transformResponse: [
    (data, headers) => {
      const contentType = headers["content-type"];
      if (contentType?.includes("application/json")) {
        try {
          return JSON.parse(data as string);
        } catch {
          return data;
        }
      }
      return data;
    }
  ]
});

function readAccessToken(): string {
  return localStorage.getItem("accessToken")?.trim() ?? "";
}

axiosInstance.interceptors.request.use(
  (request: InternalAxiosRequestConfig) => {
    const token = readAccessToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }

    if (request.data && !(request.data instanceof FormData) && !request.headers["Content-Type"]) {
      request.headers.set("Content-Type", "application/json");
      request.data = JSON.stringify(request.data);
    }

    return request;
  },
  (error) => {
    console.error("请求配置错误:", error);
    const requestError = createHttpError("请求配置错误", ApiStatus.error);
    showError(requestError, true);
    requestError.isErrorShown = true;
    return Promise.reject(requestError);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse<BaseResponse>) => {
    if (response.config.responseType === "blob") {
      return response;
    }

    const { code, message } = response.data;
    const errorMessage = message;

    if (code === BUSINESS_CODE.SUCCESS) {
      return response;
    }

    if (code === BUSINESS_CODE.UNAUTHORIZED) {
      handleUnauthorizedError(errorMessage);
    }

    if (isTokenErrorCode(code)) {
      void handleTokenError(code, errorMessage);
      const error = createHttpError(errorMessage || getTokenErrorMessage(code), code);
      error.isErrorShown = true;
      throw error;
    }

    if (code === BUSINESS_CODE.NEED_RESET_PASSWORD) {
      void handleResetPasswordError(errorMessage);
      const error = createHttpError(errorMessage || "首次登录需要重置密码", code);
      error.isErrorShown = true;
      throw error;
    }

    const error = createHttpError(errorMessage || "请求失败", code);
    const config = response.config as ExtendedAxiosRequestConfig;
    const shouldShowError = config.showErrorMessage !== false;

    if (shouldShowError) {
      showError(error, true);
      error.isErrorShown = true;
    }

    return Promise.reject(error);
  },
  async (error) => {
    const config = error.config as ExtendedAxiosRequestConfig;
    const shouldShowError = config?.showErrorMessage !== false;

    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data;

      if (error.config?.responseType === "blob" && responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const errorData = JSON.parse(text) as { message?: string; msg?: string };
          const errorMessage = errorData.message || errorData.msg || "下载失败";
          const httpError = createHttpError(errorMessage, status);
          if (shouldShowError) {
            showError(httpError, true);
            httpError.isErrorShown = true;
          }
          return Promise.reject(httpError);
        } catch {
          /* fall through */
        }
      }

      let errorMessage = "服务器错误，请稍后重试";

      if (responseData) {
        if (typeof responseData === "string") {
          errorMessage = responseData;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.msg) {
          errorMessage = responseData.msg;
        }
      }

      switch (status) {
        case 401:
          errorMessage = responseData?.message || "未授权访问";
          break;
        case 400:
          errorMessage = responseData?.message || "请求参数错误";
          break;
        case 403:
          errorMessage = responseData?.message || "没有权限访问";
          break;
        case 404:
          errorMessage = responseData?.message || "请求的资源不存在";
          break;
        case 500:
          errorMessage = responseData?.message || "服务器内部错误";
          break;
        case 502:
          errorMessage = "网关错误";
          break;
        case 503:
          errorMessage = "服务暂时不可用";
          break;
        case 504:
          errorMessage = "网关超时";
          break;
      }

      const httpError = createHttpError(errorMessage, status);

      if (shouldShowError) {
        showError(httpError, true);
        httpError.isErrorShown = true;
      }

      return Promise.reject(httpError);
    }

    let networkErrorMessage = "网络连接失败，请检查网络";

    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      networkErrorMessage = "请求超时，请稍后重试";
    } else if (error.message?.includes("Network Error")) {
      networkErrorMessage = "网络连接失败，请检查网络";
    }

    const networkError = createHttpError(networkErrorMessage, ApiStatus.error);

    if (shouldShowError) {
      showError(networkError, true);
      networkError.isErrorShown = true;
    }

    return Promise.reject(networkError);
  }
);

function createHttpError(message: string, code: number): ExtendedHttpError {
  const err = new HttpError(message, code) as ExtendedHttpError;
  err.isErrorShown = false;
  return err;
}

function isTokenErrorCode(code: number): code is keyof typeof TOKEN_ERROR_CODES {
  return code in TOKEN_ERROR_CODES;
}

function getTokenErrorMessage(code: number): string {
  return TOKEN_ERROR_CODES[code as keyof typeof TOKEN_ERROR_CODES] || "登录已失效，请重新登录";
}

function isLoggedInFromStorage(): boolean {
  return Boolean(readAccessToken() && localStorage.getItem("userInfo"));
}

function isPublicRouteName(name: string | symbol | undefined): boolean {
  return name === "Login";
}

async function handleResetPasswordError(message?: string): Promise<void> {
  const errorMessage = message || "首次登录需要重置密码";
  try {
    await ElMessageBox.alert(errorMessage + "，请返回登录页完成流程。", "需要重置密码", {
      confirmButtonText: "确定",
      type: "warning"
    });
  } catch {
    /* dismiss */
  }
  await router.push({ name: "Login" });
}

async function handleTokenError(code: number, message?: string): Promise<void> {
  const errorMessage = message || getTokenErrorMessage(code);
  const currentRoute = router.currentRoute.value;
  const isPublicPage = isPublicRouteName(currentRoute.name);

  if (!isLoggedInFromStorage()) {
    if (!isPublicPage) {
      await router.push({ name: "Login" }).catch(() => {});
    }
    return;
  }

  if (isPublicPage) {
    return;
  }

  if (!isTokenErrorShown) {
    isTokenErrorShown = true;

    try {
      await ElMessageBox.confirm(`${errorMessage}，请重新登录`, "登录已失效", {
        confirmButtonText: "重新登录",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: "warning",
        center: true,
        showClose: false
      });
      logOut();
    } catch {
      logOut();
    } finally {
      tokenErrorTimer = setTimeout(() => {
        isTokenErrorShown = false;
        if (tokenErrorTimer) {
          clearTimeout(tokenErrorTimer);
          tokenErrorTimer = null;
        }
      }, UNAUTHORIZED_DEBOUNCE_TIME);
    }
  }
}

function handleUnauthorizedError(message?: string): never {
  const error = createHttpError(message || "未授权，请重新登录", BUSINESS_CODE.UNAUTHORIZED);
  const currentRoute = router.currentRoute.value;
  const isPublicPage = isPublicRouteName(currentRoute.name);

  if (!isLoggedInFromStorage() || isPublicPage) {
    logOut();
    throw error;
  }

  if (!isUnauthorizedErrorShown) {
    isUnauthorizedErrorShown = true;
    logOut();

    unauthorizedTimer = setTimeout(resetUnauthorizedError, UNAUTHORIZED_DEBOUNCE_TIME);

    showError(error, true);
    error.isErrorShown = true;
  }

  throw error;
}

function resetUnauthorizedError(): void {
  isUnauthorizedErrorShown = false;
  if (unauthorizedTimer) {
    clearTimeout(unauthorizedTimer);
  }
  unauthorizedTimer = null;
}

let isLoggingOut = false;

function logOut(): void {
  if (isLoggingOut) {
    return;
  }

  isLoggingOut = true;

  setTimeout(() => {
    try {
      const userStore = useUserStore();
      void userStore.logOut();
    } catch (error) {
      console.error("[HTTP] logOut 执行失败:", error);
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userInfo");
        void router.push({ name: "Login" }).catch(() => {});
      } catch (resetError) {
        console.error("[HTTP] 强制清理也失败:", resetError);
      }
    } finally {
      setTimeout(() => {
        isLoggingOut = false;
      }, 2000);
    }
  }, LOGOUT_DELAY);
}

function shouldRetry(statusCode: number): boolean {
  const retryableCodes = [408, 500, 502, 503, 504];
  return retryableCodes.includes(statusCode);
}

async function retryRequest<T>(config: ExtendedAxiosRequestConfig, retries = MAX_RETRIES): Promise<T> {
  try {
    return await request<T>(config);
  } catch (error) {
    if (retries > 0 && error instanceof HttpError && shouldRetry(error.code)) {
      await delay(RETRY_DELAY);
      return retryRequest<T>(config, retries - 1);
    }
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T = unknown>(config: ExtendedAxiosRequestConfig): Promise<T> {
  if (["POST", "PUT"].includes(config.method?.toUpperCase() || "") && config.params && !config.data) {
    config.data = config.params;
    config.params = undefined;
  }

  try {
    const res = await axiosInstance.request<BaseResponse<T>>(config);

    if (config.responseType === "blob") {
      return res.data as T;
    }

    if (config.showSuccessMessage && res.data.message) {
      showSuccess(res.data.message || "操作成功");
    }

    return res.data.data as T;
  } catch (error) {
    if (error instanceof ExtendedHttpError && error.isErrorShown) {
      throw error;
    }

    throw error;
  }
}

const api = {
  get<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: "GET" });
  },

  post<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: "POST" });
  },

  put<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: "PUT" });
  },

  del<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: "DELETE" });
  },

  request<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>(config);
  }
};

export default api;
