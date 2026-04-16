<template>
  <div class="app-create-manager">
    <ElCard shadow="hover" class="header-card">
      <div class="header-content">
        <div class="header-left">
          <ElButton circle @click="handleBack">
            <ArrowLeft :size="18" />
          </ElButton>
          <h2>创建工作负载</h2>
          <ElTag type="info">{{ currentNamespace }}</ElTag>
        </div>
      </div>
    </ElCard>

    <div class="resource-type-grid">
      <ElCard
        v-for="resource in resourceTypes"
        :key="resource.type"
        shadow="hover"
        class="resource-card"
        :class="{ selected: selectedType === resource.type }"
        @click="selectResourceType(resource.type)"
      >
        <div class="card-content">
          <div class="card-icon" :style="{ background: resource.gradient }">
            <component :is="resource.icon" :size="32" />
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ resource.title }}</h3>
            <p class="card-description">{{ resource.description }}</p>
            <div class="card-features">
              <ElTag
                v-for="(feature, idx) in resource.features"
                :key="idx"
                size="small"
                effect="plain"
                type="info"
              >
                {{ feature }}
              </ElTag>
            </div>
          </div>
        </div>
      </ElCard>
    </div>

    <div class="action-footer">
      <ElButton @click="handleBack">取消</ElButton>
      <ElButton type="primary" :disabled="!selectedType" :loading="loading" @click="handleConfirm">
        <CheckCircle :size="16" style="margin-right: 4px" />
        确认创建
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  CheckCircle,
  Box,
  Copy,
  Boxes,
  Clock,
  Calendar,
  Layers
} from 'lucide-vue-next'

interface ResourceType {
  type: string
  title: string
  description: string
  icon: typeof Box
  gradient: string
  features: string[]
}

const router = useRouter()
const route = useRoute()

const resourceClusterId = ref(0)
const clusterUuid = ref('')
const workspaceId = ref(0)
const appProjectId = ref(0)
const currentNamespace = ref('default')

const selectedType = ref('')
const loading = ref(false)

const resourceTypes = ref<ResourceType[]>([
  {
    type: 'deployment',
    title: 'Deployment',
    description: '无状态应用部署，支持滚动更新和水平扩展',
    icon: Copy,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    features: ['无状态', '副本管理', '滚动更新']
  },
  {
    type: 'statefulset',
    title: 'StatefulSet',
    description: '有状态应用部署，提供稳定的网络标识和持久化存储',
    icon: Boxes,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    features: ['有状态', '稳定标识', '持久存储']
  },
  {
    type: 'daemonset',
    title: 'DaemonSet',
    description: '在每个节点上运行一个 Pod 副本，适合系统守护进程',
    icon: Layers,
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    features: ['节点守护', '全节点部署', '日志/监控']
  },
  {
    type: 'cronjob',
    title: 'CronJob',
    description: '定时任务，按照指定的时间表周期性运行',
    icon: Calendar,
    gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    features: ['定时执行', '周期性', 'Cron 表达式']
  },
  {
    type: 'job',
    title: 'Job',
    description: '一次性任务，运行完成后自动退出',
    icon: Clock,
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    features: ['一次性', '批处理', '任务完成退出']
  },
  {
    type: 'pod',
    title: 'Pod',
    description: 'Kubernetes 最小的可部署单元，包含一个或多个容器',
    icon: Box,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    features: ['单实例', '适合测试', '快速部署']
  }
])

function validateAndInitParams(): boolean {
  const clusterId = Number(route.query.resourceClusterId) || 0
  const uuid = String(route.query.clusterUuid || '')
  const spaceId = Number(route.query.workspaceId) || 0
  const projectId = Number(route.query.appProjectId) || 0
  const ns = String(route.query.namespace || '')

  if (!clusterId || !uuid || !spaceId || !projectId || !ns) {
    return false
  }

  resourceClusterId.value = clusterId
  clusterUuid.value = uuid
  workspaceId.value = spaceId
  appProjectId.value = projectId
  currentNamespace.value = ns

  return true
}

function selectResourceType(type: string) {
  selectedType.value = type
}

function handleConfirm() {
  if (!selectedType.value) return
  const resource = resourceTypes.value.find((r) => r.type === selectedType.value)
  if (!resource) return

  loading.value = true
  ElMessage.info({
    message: `${resource.title} 的完整创建向导尚未接入 cloud-web（kube-nova 中的 Deployment/StatefulSet 等子页面未合并）。可先返回应用中心管理服务，或使用命令行创建负载。`,
    duration: 6000
  })
  loading.value = false
}

function handleBack() {
  void router.replace('/workspace/application')
}

onMounted(() => {
  if (!validateAndInitParams()) {
    ElMessage.error('缺少集群或工作空间参数，请从应用中心重新点击「创建服务」')
    setTimeout(() => {
      void router.replace('/workspace/application')
    }, 1200)
  }
})
</script>

<style lang="scss" scoped>
.app-create-manager {
  padding: 20px;

  .header-card {
    margin-bottom: 20px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
      }
    }
  }

  .resource-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    margin-bottom: 20px;

    .resource-card {
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid transparent;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }

      &.selected {
        border-color: #409eff;
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
      }

      .card-content {
        display: flex;
        gap: 16px;
        padding: 8px;

        .card-icon {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .card-info {
          flex: 1;

          .card-title {
            margin: 0 0 8px;
            font-size: 18px;
            font-weight: 600;
            color: #303133;
          }

          .card-description {
            margin: 0 0 12px;
            font-size: 13px;
            color: #606266;
            line-height: 1.5;
          }

          .card-features {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
        }
      }
    }
  }

  .action-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
  }
}
</style>
