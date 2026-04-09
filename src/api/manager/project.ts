const PROJECT_BASE_PATH = "/manager/v1/project";

export interface Project {
  id: number;
  name: string;
  uuid: string;
  description: string;
  isSystem: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
  adminCount: number;
  resourceCount: number;
}

export interface SearchProjectRequest {
  page?: number;
  pageSize?: number;
  name?: string;
  uuid?: string;
}

export interface SearchProjectResponse {
  items: Project[];
  total: number;
}

export interface AddProjectRequest {
  name: string;
  description?: string;
  isSystem?: number;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
}

export interface GetProjectsByUserRequest {
  userId?: number;
  name?: string;
}

export interface ProjectAdmin {
  id: number;
  projectId: number;
  userId: number;
  createdAt: number;
}

export interface AddProjectAdminRequest {
  projectId: number;
  userIds: number[];
}

export interface ProjectCluster {
  id: number;
  clusterUuid: string;
  clusterName: string;
  projectId: number;
  cpuLimit: number;
  cpuOvercommitRatio: number;
  cpuCapacity: number;
  cpuAllocated: number;
  memLimit: number;
  memOvercommitRatio: number;
  memCapacity: number;
  memAllocated: number;
  storageLimit: number;
  storageAllocated: number;
  gpuLimit: number;
  gpuOvercommitRatio: number;
  gpuCapacity: number;
  gpuAllocated: number;
  podsLimit: number;
  podsAllocated: number;
  configmapLimit: number;
  configmapAllocated: number;
  secretLimit: number;
  secretAllocated: number;
  pvcLimit: number;
  pvcAllocated: number;
  ephemeralStorageLimit: number;
  ephemeralStorageAllocated: number;
  serviceLimit: number;
  serviceAllocated: number;
  loadbalancersLimit: number;
  loadbalancersAllocated: number;
  nodeportsLimit: number;
  nodeportsAllocated: number;
  deploymentsLimit: number;
  deploymentsAllocated: number;
  jobsLimit: number;
  jobsAllocated: number;
  cronjobsLimit: number;
  cronjobsAllocated: number;
  daemonsetsLimit: number;
  daemonsetsAllocated: number;
  statefulsetsLimit: number;
  statefulsetsAllocated: number;
  ingressesLimit: number;
  ingressesAllocated: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddProjectClusterRequest {
  clusterUuid: string;
  projectId: number;
  cpuLimit: number;
  cpuOvercommitRatio?: number;
  cpuCapacity?: number;
  memLimit: number;
  memOvercommitRatio?: number;
  memCapacity?: number;
  storageLimit?: number;
  gpuLimit?: number;
  gpuOvercommitRatio?: number;
  gpuCapacity?: number;
  podsLimit?: number;
  configmapLimit?: number;
  secretLimit?: number;
  pvcLimit?: number;
  ephemeralStorageLimit?: number;
  serviceLimit?: number;
  loadbalancersLimit?: number;
  nodeportsLimit?: number;
  deploymentsLimit?: number;
  jobsLimit?: number;
  cronjobsLimit?: number;
  daemonsetsLimit?: number;
  statefulsetsLimit?: number;
  ingressesLimit?: number;
}

export interface UpdateProjectClusterRequest {
  cpuLimit: number;
  cpuOvercommitRatio?: number;
  cpuCapacity?: number;
  memLimit: number;
  memOvercommitRatio?: number;
  memCapacity?: number;
  storageLimit?: number;
  gpuLimit?: number;
  gpuOvercommitRatio?: number;
  gpuCapacity?: number;
  podsLimit?: number;
  configmapLimit?: number;
  secretLimit?: number;
  pvcLimit?: number;
  ephemeralStorageLimit?: number;
  serviceLimit?: number;
  loadbalancersLimit?: number;
  nodeportsLimit?: number;
  deploymentsLimit?: number;
  jobsLimit?: number;
  cronjobsLimit?: number;
  daemonsetsLimit?: number;
  statefulsetsLimit?: number;
  ingressesLimit?: number;
}

export interface SearchProjectClusterRequest {
  projectId: number;
  clusterUuid?: string;
}

export interface ProjectWorkspace {
  id: number;
  projectClusterId: number;
  projectId: number;
  clusterUuid: string;
  clusterName: string;
  name: string;
  namespace: string;
  description: string;
  cpuAllocated: number;
  memAllocated: number;
  storageAllocated: number;
  gpuAllocated: number;
  podsAllocated: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddProjectWorkspaceRequest {
  projectClusterId: number;
  name: string;
  namespace: string;
  description?: string;
  cpuAllocated?: number;
  memAllocated?: number;
  storageAllocated?: number;
  gpuAllocated?: number;
  podsAllocated?: number;
}

export interface UpdateProjectWorkspaceRequest {
  name: string;
  description?: string;
  cpuAllocated?: number;
  memAllocated?: number;
  storageAllocated?: number;
  gpuAllocated?: number;
  podsAllocated?: number;
}

export interface SearchProjectWorkspaceRequest {
  projectClusterId: number;
  name?: string;
  namespace?: string;
}

function toQueryString(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, value);
  });
  return query.size > 0 ? `?${query.toString()}` : "";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function searchProjectApi(params: SearchProjectRequest): Promise<SearchProjectResponse> {
  const query = toQueryString({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 10),
    name: params.name?.trim() || undefined,
    uuid: params.uuid?.trim() || undefined
  });
  return requestJson<SearchProjectResponse>(`${PROJECT_BASE_PATH}/search${query}`, { method: "GET" });
}

export async function addProjectApi(data: AddProjectRequest): Promise<string> {
  return requestJson<string>(PROJECT_BASE_PATH, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateProjectApi(id: number, data: UpdateProjectRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteProjectApi(id: number): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/${id}`, { method: "DELETE" });
}

export async function getProjectApi(id: number): Promise<Project> {
  return requestJson<Project>(`${PROJECT_BASE_PATH}/${id}`, { method: "GET" });
}

export async function getProjectsByUserApi(params?: GetProjectsByUserRequest): Promise<Project[]> {
  const query = toQueryString({
    userId: params?.userId ? String(params.userId) : undefined,
    name: params?.name?.trim() || undefined
  });
  return requestJson<Project[]>(`${PROJECT_BASE_PATH}/user${query}`, { method: "GET" });
}

export async function addProjectAdminApi(data: AddProjectAdminRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/admin`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getProjectAdminsApi(projectId: number): Promise<ProjectAdmin[]> {
  const query = toQueryString({ projectId: String(projectId) });
  return requestJson<ProjectAdmin[]>(`${PROJECT_BASE_PATH}/admin/list${query}`, { method: "GET" });
}

export async function addProjectClusterApi(data: AddProjectClusterRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/cluster`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateProjectClusterApi(id: number, data: UpdateProjectClusterRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/cluster/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteProjectClusterApi(id: number): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/cluster/${id}`, { method: "DELETE" });
}

export async function getProjectClusterApi(id: number): Promise<ProjectCluster> {
  return requestJson<ProjectCluster>(`${PROJECT_BASE_PATH}/cluster/${id}`, { method: "GET" });
}

export async function searchProjectClusterApi(params: SearchProjectClusterRequest): Promise<ProjectCluster[]> {
  const query = toQueryString({
    projectId: String(params.projectId),
    clusterUuid: params.clusterUuid?.trim() || undefined
  });
  return requestJson<ProjectCluster[]>(`${PROJECT_BASE_PATH}/cluster/search${query}`, { method: "GET" });
}

export async function addProjectWorkspaceApi(data: AddProjectWorkspaceRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/workspace`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateProjectWorkspaceApi(id: number, data: UpdateProjectWorkspaceRequest): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/workspace/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteProjectWorkspaceApi(id: number): Promise<string> {
  return requestJson<string>(`${PROJECT_BASE_PATH}/workspace/${id}`, { method: "DELETE" });
}

export async function getProjectWorkspaceApi(id: number): Promise<ProjectWorkspace> {
  return requestJson<ProjectWorkspace>(`${PROJECT_BASE_PATH}/workspace/${id}`, { method: "GET" });
}

export async function searchProjectWorkspaceApi(
  params: SearchProjectWorkspaceRequest
): Promise<ProjectWorkspace[]> {
  const query = toQueryString({
    projectClusterId: String(params.projectClusterId),
    name: params.name?.trim() || undefined,
    namespace: params.namespace?.trim() || undefined
  });
  return requestJson<ProjectWorkspace[]>(`${PROJECT_BASE_PATH}/workspace/search${query}`, {
    method: "GET"
  });
}
