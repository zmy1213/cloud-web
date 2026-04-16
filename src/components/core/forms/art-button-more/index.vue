<!-- kube-nova-web ArtButtonMore 的轻量替代：不依赖 ArtIconButton / Iconify -->
<template>
  <ElDropdown v-if="hasAnyAuthItem" trigger="click">
    <ElButton circle class="art-more-trigger" aria-label="更多">⋮</ElButton>
    <template #dropdown>
      <ElDropdownMenu>
        <template v-for="item in list" :key="item.key">
          <ElDropdownItem
            v-if="!item.auth || hasAuth(item.auth)"
            :disabled="item.disabled"
            @click="handleClick(item)"
          >
            <span :style="{ color: item.color }">{{ item.label }}</span>
          </ElDropdownItem>
        </template>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAuth } from "@/hooks/core/useAuth";

defineOptions({ name: "ArtButtonMore" });

const { hasAuth } = useAuth();

export interface ButtonMoreItem {
  key: string | number;
  label: string;
  disabled?: boolean;
  auth?: string;
  icon?: string;
  color?: string;
  iconColor?: string;
}

interface Props {
  list: ButtonMoreItem[];
  auth?: string;
}

const props = withDefaults(defineProps<Props>(), {});

const hasAnyAuthItem = computed(() => {
  return props.list.some((item) => !item.auth || hasAuth(item.auth));
});

const emit = defineEmits<{
  click: [item: ButtonMoreItem];
}>();

function handleClick(item: ButtonMoreItem) {
  emit("click", item);
}
</script>

<style scoped>
.art-more-trigger {
  min-width: 32px;
  font-weight: 700;
  line-height: 1;
}
</style>
