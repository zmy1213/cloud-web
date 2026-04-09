const CLUSTER_MONITOR_BASE_PATH = "/console/v1/cluster-monitor";
const NODE_MONITOR_BASE_PATH = "/console/v1/node-monitor";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function toQueryString(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim() !== "") {
      query.set(key, value);
    }
  });
  return query.size > 0 ? `?${query.toString()}` : "";
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export interface ClusterOverviewMetrics {
  clusterUuid: string;
  timestamp: number;
  nodeTotal: number;
  nodeReady: number;
  podRunning: number;
  podCapacity: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
}

export interface ClusterCPUResource {
  capacity: number;
  allocatable: number;
  requestsAllocated: number;
  limitsAllocated: number;
  usage: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterMemoryResource {
  capacityBytes: number;
  allocatableBytes: number;
  requestsAllocatedBytes: number;
  limitsAllocatedBytes: number;
  usageBytes: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterPodsResource {
  running: number;
  capacity: number;
  usagePercent: number;
}

export interface ClusterStorageResource {
  capacityBytes: number;
  allocatableBytes: number;
  requestsAllocatedBytes: number;
  limitsAllocatedBytes: number;
  usageBytes: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterGPUResource {
  capacity: number;
  allocatable: number;
  requestsAllocated: number;
  limitsAllocated: number;
  usage: number;
  requestsPercent: number;
  usagePercent: number;
}

export interface ClusterResourcesMetrics {
  clusterUuid: string;
  timestamp: number;
  cpu: ClusterCPUResource;
  memory: ClusterMemoryResource;
  storage: ClusterStorageResource;
  gpu: ClusterGPUResource;
  pods: ClusterPodsResource;
}

export interface NodeMetricItem {
  nodeName: string;
  internalIp: string;
  instance: string;
  ready: boolean;
  cpuUsage: number;
  memoryUsage: number;
}

export interface ListNodesMetricsResponse {
  items: NodeMetricItem[];
  total: number;
}

export interface NodeCPUCurrent {
  timestamp: number;
  totalCores: number;
  usagePercent: number;
  userPercent: number;
  systemPercent: number;
}

export interface NodeCPUTrendPoint {
  timestamp: number;
  usagePercent: number;
}

export interface NodeCPUMetrics {
  nodeName: string;
  current: NodeCPUCurrent;
  trend: NodeCPUTrendPoint[];
}

export interface BaseClusterQueryParams {
  clusterUuid: string;
}

export interface BaseNodeQueryParams extends BaseClusterQueryParams {
  nodeName: string;
  start?: string;
  end?: string;
  step?: string;
}

export async function getClusterOverviewApi(params: BaseClusterQueryParams): Promise<ClusterOverviewMetrics> {
  const query = toQueryString({ clusterUuid: params.clusterUuid });
  return requestJson<ClusterOverviewMetrics>(`${CLUSTER_MONITOR_BASE_PATH}/overview${query}`);
}

export async function getClusterResourcesApi(params: BaseClusterQueryParams): Promise<ClusterResourcesMetrics> {
  const query = toQueryString({ clusterUuid: params.clusterUuid });
  return requestJson<ClusterResourcesMetrics>(`${CLUSTER_MONITOR_BASE_PATH}/resources${query}`);
}

export async function listNodesMetricsApi(params: BaseClusterQueryParams): Promise<ListNodesMetricsResponse> {
  const query = toQueryString({ clusterUuid: params.clusterUuid });
  return requestJson<ListNodesMetricsResponse>(`${NODE_MONITOR_BASE_PATH}/list${query}`);
}

export async function getNodeCPUApi(params: BaseNodeQueryParams): Promise<NodeCPUMetrics> {
  const query = toQueryString({
    clusterUuid: params.clusterUuid,
    nodeName: params.nodeName,
    start: params.start,
    end: params.end,
    step: params.step
  });
  return requestJson<NodeCPUMetrics>(`${NODE_MONITOR_BASE_PATH}/cpu${query}`);
}
