<template>
  <div class="energy-page">
    <header class="page-head">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>
          仅展示当前账号已关联集群的微服务算电异常数据（静态演示）。
        </p>
      </div>
      <div class="head-tags">
        <span class="tag">账号：{{ currentUserName }}</span>
        <span class="tag">可见集群：{{ scopedClusterCount }}</span>
        <span class="tag accent">静态页面</span>
      </div>
    </header>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="label">异常事件数</span>
        <strong>{{ summary.totalEvents }}</strong>
        <small>近 24 小时</small>
      </article>
      <article class="summary-card">
        <span class="label">高风险服务</span>
        <strong>{{ summary.highRiskServices }}</strong>
        <small>严重等级告警</small>
      </article>
      <article class="summary-card">
        <span class="label">涉及集群</span>
        <strong>{{ summary.relatedClusters }}</strong>
        <small>账号可见范围</small>
      </article>
      <article class="summary-card">
        <span class="label">估算额外能耗</span>
        <strong>{{ summary.extraPowerKwh }} kWh</strong>
        <small>近 24 小时</small>
      </article>
    </section>

    <section v-if="mode === 'overview'" class="overview-wrap">
      <div class="panel">
        <div class="panel-head">
          <h3>集群算电概览</h3>
          <span>当前账号可见范围</span>
        </div>
        <div class="cluster-grid">
          <article v-for="item in clusterOverviewRows" :key="item.cluster" class="cluster-card">
            <h4>{{ item.cluster }}</h4>
            <p>服务数：{{ item.serviceCount }}</p>
            <p>异常数：{{ item.eventCount }}</p>
            <p>估算额外能耗：{{ item.extraPowerKwh }} kWh</p>
            <p class="warn">峰值功耗：{{ item.peakPowerW }} W</p>
          </article>
        </div>
      </div>
    </section>

    <section v-else class="anomaly-wrap">
      <div class="panel">
        <div class="panel-head">
          <h3>微服务算电异常清单</h3>
          <span>仅静态展示，不落库</span>
        </div>
        <div class="filter-row">
          <label>
            集群
            <select v-model="filters.cluster">
              <option value="">全部</option>
              <option v-for="cluster in scopedClusters" :key="cluster" :value="cluster">
                {{ cluster }}
              </option>
            </select>
          </label>
          <label>
            风险等级
            <select v-model="filters.severity">
              <option value="">全部</option>
              <option value="critical">严重</option>
              <option value="warning">告警</option>
              <option value="info">提示</option>
            </select>
          </label>
          <label class="keyword">
            服务关键词
            <input v-model.trim="filters.keyword" placeholder="如：api-gateway / worker" />
          </label>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>集群</th>
                <th>命名空间 / 服务</th>
                <th>异常类型</th>
                <th>风险等级</th>
                <th>当前功耗</th>
                <th>基线功耗</th>
                <th>额外能耗(24h)</th>
                <th>最近检测</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRows.length === 0">
                <td colspan="8" class="empty">当前筛选条件下暂无数据</td>
              </tr>
              <tr v-for="row in filteredRows" v-else :key="row.id">
                <td>{{ row.cluster }}</td>
                <td>{{ row.namespace }} / {{ row.service }}</td>
                <td>{{ row.anomalyType }}</td>
                <td>
                  <span class="severity" :class="row.severity">
                    {{ severityLabel(row.severity) }}
                  </span>
                </td>
                <td>{{ row.currentPowerW }} W</td>
                <td>{{ row.baselinePowerW }} W</td>
                <td>{{ row.extraPowerKwh }} kWh</td>
                <td>{{ row.detectedAt }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel ranking-panel">
        <div class="panel-head">
          <h3>异常服务排行</h3>
          <span>按额外能耗排序</span>
        </div>
        <ul class="ranking-list">
          <li v-for="item in topExtraPowerServices" :key="item.name">
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.cluster }}</p>
            </div>
            <span>{{ item.extraPowerKwh }} kWh</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";

type Severity = "critical" | "warning" | "info";
type ViewMode = "overview" | "anomaly";

interface EnergyAnomalyRow {
  id: number;
  cluster: string;
  namespace: string;
  service: string;
  anomalyType: string;
  severity: Severity;
  currentPowerW: number;
  baselinePowerW: number;
  extraPowerKwh: number;
  detectedAt: string;
  scopeUsers: string[];
}

const props = withDefaults(
  defineProps<{
    mode?: ViewMode;
  }>(),
  {
    mode: "anomaly"
  }
);

const allRows: EnergyAnomalyRow[] = [
  {
    id: 1,
    cluster: "kind-ks-dev",
    namespace: "gateway",
    service: "api-gateway",
    anomalyType: "持续高功耗",
    severity: "critical",
    currentPowerW: 128,
    baselinePowerW: 72,
    extraPowerKwh: 12.7,
    detectedAt: "2026-04-17 09:42:31",
    scopeUsers: ["super_admin", "alice", "scope_user_a_20260412"]
  },
  {
    id: 2,
    cluster: "kind-ks-dev",
    namespace: "project-a",
    service: "order-worker",
    anomalyType: "空闲资源异常",
    severity: "warning",
    currentPowerW: 88,
    baselinePowerW: 49,
    extraPowerKwh: 8.3,
    detectedAt: "2026-04-17 10:15:09",
    scopeUsers: ["super_admin", "alice"]
  },
  {
    id: 3,
    cluster: "edge-gz-01",
    namespace: "project-b",
    service: "video-transcoder",
    anomalyType: "突发峰值异常",
    severity: "critical",
    currentPowerW: 216,
    baselinePowerW: 132,
    extraPowerKwh: 19.2,
    detectedAt: "2026-04-17 10:30:44",
    scopeUsers: ["super_admin", "bob"]
  },
  {
    id: 4,
    cluster: "edge-gz-01",
    namespace: "monitoring",
    service: "metrics-collector",
    anomalyType: "周期振荡异常",
    severity: "info",
    currentPowerW: 41,
    baselinePowerW: 28,
    extraPowerKwh: 2.4,
    detectedAt: "2026-04-17 11:02:20",
    scopeUsers: ["super_admin", "bob"]
  },
  {
    id: 5,
    cluster: "prod-bj-02",
    namespace: "project-c",
    service: "billing-api",
    anomalyType: "持续高功耗",
    severity: "warning",
    currentPowerW: 97,
    baselinePowerW: 64,
    extraPowerKwh: 6.9,
    detectedAt: "2026-04-17 11:24:11",
    scopeUsers: ["super_admin", "scope_user_a_20260412"]
  }
];

const filters = reactive({
  cluster: "",
  severity: "",
  keyword: ""
});

const currentUserName = computed(() => {
  try {
    const raw = localStorage.getItem("userInfo");
    if (!raw) return "unknown";
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username?.trim() || "unknown";
  } catch (error) {
    console.error("parse userInfo failed", error);
    return "unknown";
  }
});

const scopedRows = computed(() => {
  const username = currentUserName.value;
  if (username === "super_admin") {
    return allRows;
  }
  return allRows.filter((item) => item.scopeUsers.includes(username));
});

const scopedClusters = computed(() => {
  return Array.from(new Set(scopedRows.value.map((item) => item.cluster)));
});

const scopedClusterCount = computed(() => scopedClusters.value.length);

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  return scopedRows.value.filter((item) => {
    if (filters.cluster && item.cluster !== filters.cluster) {
      return false;
    }
    if (filters.severity && item.severity !== filters.severity) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const searchable = `${item.namespace} ${item.service} ${item.anomalyType}`.toLowerCase();
    return searchable.includes(keyword);
  });
});

const summary = computed(() => {
  const rows = filteredRows.value;
  const clusterSet = new Set(rows.map((item) => item.cluster));
  const serviceSet = new Set(
    rows.filter((item) => item.severity === "critical").map((item) => `${item.namespace}/${item.service}`)
  );
  const totalExtraPower = rows.reduce((acc, item) => acc + item.extraPowerKwh, 0);

  return {
    totalEvents: rows.length,
    highRiskServices: serviceSet.size,
    relatedClusters: clusterSet.size,
    extraPowerKwh: totalExtraPower.toFixed(1)
  };
});

const clusterOverviewRows = computed(() => {
  const map = new Map<
    string,
    { cluster: string; serviceCount: number; eventCount: number; extraPowerKwh: string; peakPowerW: number }
  >();

  scopedRows.value.forEach((item) => {
    const prev = map.get(item.cluster) ?? {
      cluster: item.cluster,
      serviceCount: 0,
      eventCount: 0,
      extraPowerKwh: "0.0",
      peakPowerW: 0
    };
    prev.serviceCount += 1;
    prev.eventCount += 1;
    prev.peakPowerW = Math.max(prev.peakPowerW, item.currentPowerW);
    prev.extraPowerKwh = (Number(prev.extraPowerKwh) + item.extraPowerKwh).toFixed(1);
    map.set(item.cluster, prev);
  });

  return Array.from(map.values());
});

const topExtraPowerServices = computed(() => {
  return [...filteredRows.value]
    .sort((a, b) => b.extraPowerKwh - a.extraPowerKwh)
    .slice(0, 6)
    .map((item) => ({
      name: `${item.namespace}/${item.service}`,
      cluster: item.cluster,
      extraPowerKwh: item.extraPowerKwh.toFixed(1)
    }));
});

const pageTitle = computed(() => {
  if (props.mode === "overview") {
    return "算电概览";
  }
  return "算力异常检测";
});

function severityLabel(severity: Severity): string {
  if (severity === "critical") return "严重";
  if (severity === "warning") return "告警";
  return "提示";
}
</script>

<style scoped>
.energy-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f4f8ff 0%, #eef9f2 52%, #fff7ec 100%);
  border: 1px solid #dbe5ff;
}

.page-head h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #142033;
}

.page-head p {
  margin: 0;
  color: #4a5a76;
  font-size: 13px;
}

.head-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #31415f;
  background: #ffffffcc;
  border: 1px solid #d6e1ff;
}

.tag.accent {
  color: #7a4400;
  border-color: #ffd4a5;
  background: #fff4e5;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e4e9f3;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card .label {
  font-size: 12px;
  color: #667594;
}

.summary-card strong {
  font-size: 22px;
  line-height: 1.1;
  color: #172541;
}

.summary-card small {
  font-size: 12px;
  color: #8a97b0;
}

.overview-wrap,
.anomaly-wrap {
  display: grid;
  gap: 14px;
}

.anomaly-wrap {
  grid-template-columns: minmax(0, 1fr) 320px;
}

.panel {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e4e9f3;
  background: #fff;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-head h3 {
  margin: 0;
  font-size: 16px;
  color: #172541;
}

.panel-head span {
  font-size: 12px;
  color: #7f8aa1;
}

.cluster-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.cluster-card {
  border-radius: 10px;
  border: 1px solid #e6ecf8;
  padding: 12px;
  background: #fbfdff;
}

.cluster-card h4 {
  margin: 0 0 10px;
  font-size: 15px;
  color: #1a2a4d;
}

.cluster-card p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #51607d;
}

.cluster-card .warn {
  color: #a75500;
}

.filter-row {
  display: grid;
  grid-template-columns: 180px 180px minmax(220px, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.filter-row label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #62708c;
}

.filter-row select,
.filter-row input {
  height: 34px;
  border-radius: 8px;
  border: 1px solid #d6deee;
  background: #fff;
  padding: 0 10px;
  color: #1c2b47;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
}

th,
td {
  border-bottom: 1px solid #edf1f7;
  padding: 10px 8px;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

th {
  color: #60708d;
  font-weight: 600;
  background: #f7faff;
}

td {
  color: #1d2d49;
}

.empty {
  text-align: center;
  color: #8c97ad;
}

.severity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid transparent;
}

.severity.critical {
  color: #9f1d20;
  background: #ffe8ea;
  border-color: #ffc6ca;
}

.severity.warning {
  color: #9b5d00;
  background: #fff4df;
  border-color: #ffdca5;
}

.severity.info {
  color: #0c5f8e;
  background: #e9f6ff;
  border-color: #c7e9ff;
}

.ranking-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-list li {
  border: 1px solid #e9edf6;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ranking-list strong {
  font-size: 13px;
  color: #1d2d49;
}

.ranking-list p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #7d8aa3;
}

.ranking-list span {
  font-size: 13px;
  color: #8a4d00;
  font-weight: 600;
}

@media (max-width: 1360px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .anomaly-wrap {
    grid-template-columns: minmax(0, 1fr);
  }

  .cluster-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .page-head {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .cluster-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
