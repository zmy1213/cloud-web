/**
 * kube-nova-web 兼容占位：控制台权限仍由路由守卫 + permission 快照负责。
 */
export function useAuth() {
  return {
    hasAuth: (_permission?: string) => true
  };
}
