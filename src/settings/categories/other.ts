import type { SettingCategory } from "@/types/settings-schema";
import PlatformAccount from "@/components/settings/custom/PlatformAccount.vue";
import SkipKeywordsConfig from "@/components/settings/custom/SkipKeywordsConfig.vue";
import IconLucideSettings from "~icons/lucide/settings";
import { useDataStore } from "@/stores/data";
import { useUserStore } from "@/stores/user";

const otherCategory: SettingCategory = {
  id: "other",
  icon: IconLucideSettings,
  sections: [
    {
      id: "platformLogin",
      tag: { text: "Beta" },
      items: [
        {
          key: "qmAccount",
          type: "custom",
          component: PlatformAccount,
          componentProps: { platform: "qqmusic" },
          fullWidth: true,
          descriptionKey: "settings.platformLogin.desc",
          keywords: [
            "settings.platformLogin.title",
            "settings.platformLogin.desc",
            "settings.platformLogin.loginWeb",
            "settings.platformLogin.manualCookie",
          ],
        },
        {
          key: "kgAccount",
          type: "custom",
          component: PlatformAccount,
          componentProps: { platform: "kugou" },
          fullWidth: true,
          descriptionKey: "settings.platformLogin.desc",
          keywords: [
            "settings.platformLogin.title",
            "settings.platformLogin.desc",
            "settings.platformLogin.loginQr",
            "settings.platformLogin.manualCookie",
          ],
        },
      ],
    },
    {
      id: "platformConfig",
      tag: { text: "Beta" },
      items: [
        {
          key: "kugouLoginVersion",
          type: "select",
          binding: { store: "settings", path: "system.system.kugouLoginVersion" },
          options: [
            { value: "standard", labelKey: "settings.kugouLoginVersion.standard" },
            { value: "concept", labelKey: "settings.kugouLoginVersion.concept" },
          ],
          defaultValue: "concept",
          confirm: {
            titleKey: "settings.confirm.kugouLoginVersionTitle",
            contentKey: "settings.confirm.kugouLoginVersionContent",
            type: "warning",
          },
          action: async () => {
            // 旧凭据与新 appid 不匹配，切换后必须重新扫码，直接清掉避免半失效状态
            await window.api.apis.clearSession("kugou");
            useDataStore().clearPlatformProfile("kugou");
            await useUserStore().loadKugouContent();
          },
        },
      ],
    },
    {
      id: "preset",
      items: [
        {
          key: "skipKeywordsSongs",
          type: "custom",
          component: SkipKeywordsConfig,
        },
        {
          key: "hideVipTag",
          type: "switch",
          binding: { store: "settings", path: "preset.hideVipTag" },
          defaultValue: false,
        },
        {
          key: "hideQualityTag",
          type: "switch",
          binding: { store: "settings", path: "preset.hideQualityTag" },
          defaultValue: false,
        },
        {
          key: "hideExplicitTag",
          type: "switch",
          binding: { store: "settings", path: "preset.hideExplicitTag" },
          defaultValue: false,
        },
        {
          key: "showSubtitle",
          type: "switch",
          binding: { store: "settings", path: "preset.showSubtitle" },
          defaultValue: true,
        },
      ],
    },
  ],
};

export default otherCategory;
