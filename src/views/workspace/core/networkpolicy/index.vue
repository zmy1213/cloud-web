<template>
  <div class="network-policy-page art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader
        v-model:columns="columns"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        :showZebra="true"
        :showBorder="true"
        :showHeaderBackground="true"
        :fullClass="'art-page-view'"
        :layout="'search,refresh,size,fullscreen,columns,settings'"
        @refresh="loadData"
      >
        <template #left>
          <ElSpace wrap>
            <ElInput
              v-model="searchKeyword"
              clearable
              placeholder="按名称搜索…"
              style="width: 220px"
              @keyup.enter="applySearch"
            />
            <ElButton type="primary" @click="applySearch">
              <Search :size="16" style="margin-right: 4px" />
              搜索
            </ElButton>
            <ElButton type="primary" @click="handleCreate">
              <Plus :size="16" style="margin-right: 4px" />
              新建策略
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="displayData"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDialog
      v-model="yamlDialogVisible"
      :title="yamlDialogTitle"
      width="720px"
      top="6vh"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="onYamlDialogClosed"
    >
      <ElInput
        v-model="yamlContent"
        type="textarea"
        :rows="22"
        :readonly="yamlReadonly"
        placeholder="Kubernetes NetworkPolicy YAML"
        class="yaml-textarea"
      />
      <template #footer>
        <ElButton @click="yamlDialogVisible = false">关闭</ElButton>
        <ElButton v-if="!yamlReadonly" type="primary" :loading="yamlSaving" @click="submitYaml">
          提交
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, Search } from 'lucide-vue-next'
  import type { ProjectWorkspace } from '@/api'
  import {
    getNetworkPolicyListApi,
    getNetworkPolicyYamlApi,
    createNetworkPolicyApi,
    updateNetworkPolicyApi,
    deleteNetworkPolicyApi,
    type NetworkPolicyListItem
  } from '@/api/workload/networkpolicy'
  import { useNetworkPolicyTableConfig } from './composables/table-config'

  defineOptions({ name: 'NetworkPolicyManagement' })

  interface Props {
    workspace?: ProjectWorkspace
    refreshTrigger?: number
  }

  const props = defineProps<Props>()
  const emit = defineEmits(['loaded'])

  const { loading, showSearchBar, deleteLoadingMap, downloadLoadingMap, createTableColumns } =
    useNetworkPolicyTableConfig()

  const allData = ref<NetworkPolicyListItem[]>([])
  const useServerPagination = ref(false)
  const searchKeyword = ref('')
  const activeSearch = ref('')

  const pagination = ref({
    current: 1,
    size: 20,
    total: 0
  })

  const yamlDialogVisible = ref(false)
  const yamlReadonly = ref(false)
  const yamlContent = ref('')
  const yamlSaving = ref(false)
  const yamlDialogMode = ref<'create' | 'edit' | 'view'>('view')
  const yamlEditTarget = ref<NetworkPolicyListItem | null>(null)

  const yamlDialogTitle = computed(() => {
    if (yamlDialogMode.value === 'create') return '新建 NetworkPolicy（YAML）'
    if (yamlDialogMode.value === 'edit') return `编辑：${yamlEditTarget.value?.name || ''}`
    return `查看：${yamlEditTarget.value?.name || ''}`
  })

  const displayData = computed(() => {
    if (useServerPagination.value) return allData.value
    const start = (pagination.value.current - 1) * pagination.value.size
    return allData.value.slice(start, start + pagination.value.size)
  })

  function defaultYaml() {
    return `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress
`
  }

  const rowKey = (r: NetworkPolicyListItem) => `${r.namespace}/${r.name}`

  const handleViewYaml = async (row: NetworkPolicyListItem) => {
    if (!props.workspace) return
    yamlDialogMode.value = 'view'
    yamlEditTarget.value = row
    yamlReadonly.value = true
    yamlDialogVisible.value = true
    yamlContent.value = ''
    try {
      yamlContent.value = await getNetworkPolicyYamlApi({
        clusterUuid: props.workspace.clusterUuid,
        namespace: props.workspace.namespace,
        name: row.name
      })
    } catch {
      ElMessage.error('获取 YAML 失败')
      yamlDialogVisible.value = false
    }
  }

  const handleEditYaml = async (row: NetworkPolicyListItem) => {
    if (!props.workspace) return
    yamlDialogMode.value = 'edit'
    yamlEditTarget.value = row
    yamlReadonly.value = false
    yamlDialogVisible.value = true
    yamlContent.value = ''
    try {
      yamlContent.value = await getNetworkPolicyYamlApi({
        clusterUuid: props.workspace.clusterUuid,
        namespace: props.workspace.namespace,
        name: row.name
      })
    } catch {
      ElMessage.error('获取 YAML 失败')
      yamlDialogVisible.value = false
    }
  }

  const handleCreate = () => {
    if (!props.workspace) return
    yamlDialogMode.value = 'create'
    yamlEditTarget.value = null
    yamlReadonly.value = false
    yamlContent.value = defaultYaml()
    yamlDialogVisible.value = true
  }

  const submitYaml = async () => {
    if (!props.workspace) return
    const body = {
      clusterUuid: props.workspace.clusterUuid,
      namespace: props.workspace.namespace,
      yamlStr: yamlContent.value
    }
    yamlSaving.value = true
    try {
      if (yamlDialogMode.value === 'create') {
        await createNetworkPolicyApi(body)
        ElMessage.success('创建成功')
      } else if (yamlDialogMode.value === 'edit') {
        await updateNetworkPolicyApi(body)
        ElMessage.success('更新成功')
      }
      yamlDialogVisible.value = false
      loadData()
    } catch {
      /* http 层已提示 */
    } finally {
      yamlSaving.value = false
    }
  }

  const onYamlDialogClosed = () => {
    yamlContent.value = ''
    yamlEditTarget.value = null
  }

  const handleDownloadYaml = async (row: NetworkPolicyListItem) => {
    if (!props.workspace) return
    const k = rowKey(row)
    try {
      downloadLoadingMap.value[k] = true
      const yaml = await getNetworkPolicyYamlApi({
        clusterUuid: props.workspace.clusterUuid,
        namespace: props.workspace.namespace,
        name: row.name
      })
      const blob = new Blob([yaml], { type: 'text/yaml' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${row.name}.yaml`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      ElMessage.success('下载成功')
    } catch {
      console.error('下载 YAML 失败')
    } finally {
      downloadLoadingMap.value[k] = false
    }
  }

  const handleDelete = async (row: NetworkPolicyListItem) => {
    if (!props.workspace) return
    const k = rowKey(row)
    try {
      await ElMessageBox.confirm(
        `确定删除 NetworkPolicy「${row.name}」吗？此操作不可恢复。`,
        '删除确认',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
      deleteLoadingMap.value[k] = true
      await deleteNetworkPolicyApi({
        clusterUuid: props.workspace.clusterUuid,
        namespace: props.workspace.namespace,
        name: row.name
      })
      ElMessage.success('已删除')
      loadData()
    } catch (e: any) {
      if (e !== 'cancel') console.error(e)
    } finally {
      deleteLoadingMap.value[k] = false
    }
  }

  const { columns } = createTableColumns({
    handleViewYaml,
    handleEditYaml,
    handleDownloadYaml,
    handleDelete
  })

  const applySearch = () => {
    activeSearch.value = searchKeyword.value.trim()
    pagination.value.current = 1
    loadData()
  }

  const loadData = async () => {
    if (!props.workspace?.clusterUuid || !props.workspace?.namespace) {
      allData.value = []
      pagination.value.total = 0
      return
    }

    loading.value = true
    try {
      const res = await getNetworkPolicyListApi({
        clusterUuid: props.workspace.clusterUuid,
        namespace: props.workspace.namespace,
        search: activeSearch.value || undefined
      })
      const items = res?.items ?? []
      allData.value = items
      useServerPagination.value = false
      pagination.value.total = res?.total ?? items.length
      emit('loaded')
    } catch {
      allData.value = []
      pagination.value.total = 0
    } finally {
      loading.value = false
    }
  }

  const handleSizeChange = (size: number) => {
    pagination.value.size = size
    pagination.value.current = 1
  }

  const handleCurrentChange = (current: number) => {
    pagination.value.current = current
  }

  watch(
    () => props.refreshTrigger,
    () => {
      if (props.workspace) loadData()
    }
  )

  watch(
    () => props.workspace,
    (w) => {
      if (w) {
        activeSearch.value = ''
        searchKeyword.value = ''
        pagination.value.current = 1
        loadData()
      } else {
        allData.value = []
        pagination.value.total = 0
      }
    }
  )

  onMounted(() => {
    if (props.workspace) loadData()
  })
</script>

<style lang="scss" scoped>
  .network-policy-page {
    padding-bottom: 20px;
  }

  :deep(.yaml-textarea textarea) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
  }
</style>
