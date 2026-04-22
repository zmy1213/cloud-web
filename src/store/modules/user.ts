/**
 * 精简用户会话（与 kube-nova 的 axios 拦截器配合：token 存 localStorage，退出时清理）
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { router } from "@/router";
import { LOGIN_PATH } from "@/router/paths";
import { clearPermissionSnapshot } from "@/utils/permission";
import { useProjectStore } from "@/store/modules/project";
import { useApplicationManagementStore } from "@/store/modules/applicationManagement";

function readUserInfo(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem("userInfo");
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const useUserStore = defineStore("userStore", () => {
  const accessToken = ref(localStorage.getItem("accessToken") ?? "");
  const info = ref<Record<string, unknown>>(readUserInfo());

  async function logOut(): Promise<void> {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userInfo");
    accessToken.value = "";
    info.value = {};
    clearPermissionSnapshot();
    try {
      useProjectStore().clearAllStoredData();
    } catch (error) {
      console.error("[user] clear project store failed", error);
    }
    try {
      useApplicationManagementStore().clearAllStoredData();
    } catch (error) {
      console.error("[user] clear application management store failed", error);
    }
    await router.replace(LOGIN_PATH);
  }

  return {
    accessToken,
    info,
    logOut
  };
});
