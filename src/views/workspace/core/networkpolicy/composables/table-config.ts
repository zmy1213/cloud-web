import { ref, h } from 'vue'
import { ElTag } from 'element-plus'
import { Network } from 'lucide-vue-next'
import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
import type { NetworkPolicyListItem } from '@/api/workload/networkpolicy'

export function useNetworkPolicyTableConfig() {
  const loading = ref(true)
  const showSearchBar = ref(false)
  const deleteLoadingMap = ref<Record<string, boolean>>({})
  const downloadLoadingMap = ref<Record<string, boolean>>({})

  const createTableColumns = (handlers: {
    handleViewYaml: (row: NetworkPolicyListItem) => void
    handleEditYaml: (row: NetworkPolicyListItem) => void
    handleDownloadYaml: (row: NetworkPolicyListItem) => void
    handleDelete: (row: NetworkPolicyListItem) => void
  }) => {
    const { handleViewYaml, handleEditYaml, handleDownloadYaml, handleDelete } = handlers

    const allColumns = [
      {
        prop: 'name',
        label: '名称',
        minWidth: 200,
        fixed: 'left' as const,
        showOverflowTooltip: true,
        visible: true,
        formatter: (row: Record<string, any>) => {
          const r = row as NetworkPolicyListItem
          return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
            h(Network, { size: 16, style: 'color: #409eff; flex-shrink: 0;' }),
            h('span', { style: 'font-weight: 500;' }, r.name)
          ])
        }
      },
      {
        prop: 'namespace',
        label: '命名空间',
        minWidth: 140,
        showOverflowTooltip: true,
        visible: true
      },
      {
        prop: 'labels',
        label: '标签',
        minWidth: 160,
        showOverflowTooltip: true,
        visible: true,
        formatter: (row: Record<string, any>) => {
          const r = row as NetworkPolicyListItem
          const labels = r.labels || {}
          const keys = Object.keys(labels)
          if (!keys.length) return h('span', { style: 'color: #909399;' }, '—')
          return h('div', { style: 'display: flex; flex-wrap: wrap; gap: 4px;' }, [
            ...keys.slice(0, 3).map((k) =>
              h(ElTag, { size: 'small', type: 'info' }, () => `${k}=${labels[k]}`)
            ),
            keys.length > 3 ? h(ElTag, { size: 'small' }, () => `+${keys.length - 3}`) : null
          ])
        }
      },
      {
        prop: 'age',
        label: '存活时间',
        width: 120,
        visible: true
      },
      {
        prop: 'operation',
        label: '操作',
        width: 88,
        fixed: 'right' as const,
        align: 'center' as const,
        visible: true,
        formatter: (row: Record<string, any>) => {
          const r = row as NetworkPolicyListItem
          const key = `${r.namespace}/${r.name}`
          const isDeleting = deleteLoadingMap.value[key] || false
          const isDownloading = downloadLoadingMap.value[key] || false
          const isAnyLoading = isDeleting || isDownloading

          return h(ArtButtonMore, {
            list: [
              { key: 'view', label: '查看 YAML', icon: 'lucide:eye', disabled: isAnyLoading },
              { key: 'edit', label: '编辑 YAML', icon: 'lucide:edit', disabled: isAnyLoading },
              {
                key: 'download',
                label: isDownloading ? '下载中…' : '下载 YAML',
                icon: 'lucide:download',
                disabled: isAnyLoading
              },
              {
                key: 'delete',
                label: isDeleting ? '删除中…' : '删除',
                icon: 'lucide:trash-2',
                color: '#f56c6c',
                disabled: isAnyLoading
              }
            ] as ButtonMoreItem[],
            onClick: (item: ButtonMoreItem) => {
              if (isAnyLoading) return
              switch (item.key) {
                case 'view':
                  handleViewYaml(r)
                  break
                case 'edit':
                  handleEditYaml(r)
                  break
                case 'download':
                  handleDownloadYaml(r)
                  break
                case 'delete':
                  handleDelete(r)
                  break
              }
            }
          })
        }
      }
    ]

    const columns = ref(allColumns)

    return { columns }
  }

  return {
    loading,
    showSearchBar,
    deleteLoadingMap,
    downloadLoadingMap,
    createTableColumns
  }
}
