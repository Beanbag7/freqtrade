/**
 * 多标签页持久化同步:zustand persist 是 last-writer-wins 且默认不监听
 * storage 事件,两个标签各自持有一份内存快照,会互相覆写——
 * 机器人注册表丢条目、设置改动静默回退、退出登录后被另一标签的令牌刷新
 * 写回 localStorage"复活"登录态。这里在 storage 事件上整体 rehydrate,
 * 以最新落盘值收敛所有标签(编辑中的表单状态不在持久化范围内,不受影响)。
 */
import { useAuthStore } from "@/lib/auth";
import { useUiSettings } from "@/lib/settings";
import { useBotRegistry } from "@/lib/api/multibot";

const rehydrateByKey: Record<string, () => void> = {
  "freqtrade-ui-auth": () => void useAuthStore.persist.rehydrate(),
  "freqtrade-ui-settings": () => void useUiSettings.persist.rehydrate(),
  "freqtrade-ui-bots": () => void useBotRegistry.persist.rehydrate(),
};

export function initCrossTabSync() {
  window.addEventListener("storage", (e) => {
    if (e.key && rehydrateByKey[e.key]) rehydrateByKey[e.key]();
  });
}
