<template>
  <div class="project-page">
    <header class="toolbar">
      <div class="left">
        <input v-model.trim="filters.name" placeholder="按项目名搜索" />
        <input v-model.trim="filters.uuid" placeholder="按UUID搜索" />
        <button @click="search">搜索</button>
        <button @click="reset">重置</button>
      </div>
      <div class="right">
        <button @click="openCreate">新建项目</button>
        <button @click="loadData">刷新</button>
      </div>
    </header>

    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

    <table class="project-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>项目名称</th>
          <th>UUID</th>
          <th>系统项目</th>
          <th>管理员数</th>
          <th>资源数</th>
          <th>描述</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in projects" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.uuid }}</td>
          <td>{{ item.isSystem === 1 ? "是" : "否" }}</td>
          <td>{{ item.adminCount }}</td>
          <td>{{ item.resourceCount }}</td>
          <td>{{ item.description || "-" }}</td>
          <td class="actions">
            <button @click="openEdit(item)">编辑</button>
            <button @click="assignMembers(item)">分配成员</button>
            <button @click="remove(item)">删除</button>
          </td>
        </tr>
        <tr v-if="!loading && projects.length === 0">
          <td colspan="8" class="empty">暂无项目数据</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>总数: {{ total }}</span>
      <div class="pager">
        <button :disabled="pagination.page <= 1" @click="prevPage">上一页</button>
        <span>{{ pagination.page }}</span>
        <button :disabled="projects.length < pagination.pageSize" @click="nextPage">下一页</button>
      </div>
    </div>

    <div v-if="dialog.visible" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialog.mode === "create" ? "新建项目" : "编辑项目" }}</h3>
        <label>项目名称</label>
        <input v-model.trim="dialog.form.name" maxlength="100" />
        <label>项目描述</label>
        <textarea v-model.trim="dialog.form.description" maxlength="500" rows="4" />
        <div class="dialog-actions">
          <button @click="closeDialog">取消</button>
          <button @click="submitDialog">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  addProjectAdminApi,
  addProjectApi,
  deleteProjectApi,
  searchProjectApi,
  type Project,
  updateProjectApi
} from "../../../api/manager/project";

const loading = ref(false);
const errorMsg = ref("");
const projects = ref<Project[]>([]);
const total = ref(0);

const pagination = reactive({
  page: 1,
  pageSize: 10
});

const filters = reactive({
  name: "",
  uuid: ""
});

const dialog = reactive({
  visible: false,
  mode: "create" as "create" | "edit",
  targetId: 0,
  form: {
    name: "",
    description: ""
  }
});

async function loadData() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const resp = await searchProjectApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: filters.name,
      uuid: filters.uuid
    });
    projects.value = resp.items ?? [];
    total.value = resp.total ?? 0;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "加载项目失败";
  } finally {
    loading.value = false;
  }
}

function search() {
  pagination.page = 1;
  void loadData();
}

function reset() {
  filters.name = "";
  filters.uuid = "";
  pagination.page = 1;
  void loadData();
}

function openCreate() {
  dialog.visible = true;
  dialog.mode = "create";
  dialog.targetId = 0;
  dialog.form.name = "";
  dialog.form.description = "";
}

function openEdit(item: Project) {
  dialog.visible = true;
  dialog.mode = "edit";
  dialog.targetId = item.id;
  dialog.form.name = item.name;
  dialog.form.description = item.description || "";
}

function closeDialog() {
  dialog.visible = false;
}

async function submitDialog() {
  if (!dialog.form.name) {
    errorMsg.value = "项目名称不能为空";
    return;
  }
  try {
    if (dialog.mode === "create") {
      await addProjectApi({
        name: dialog.form.name,
        description: dialog.form.description,
        isSystem: 0
      });
    } else {
      await updateProjectApi(dialog.targetId, {
        name: dialog.form.name,
        description: dialog.form.description
      });
    }
    dialog.visible = false;
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "保存项目失败";
  }
}

async function remove(item: Project) {
  if (!confirm(`确定删除项目 "${item.name}" 吗？`)) return;
  try {
    await deleteProjectApi(item.id);
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "删除项目失败";
  }
}

async function assignMembers(item: Project) {
  const raw = prompt("请输入用户ID列表，逗号分隔（例如 1,2,3）", "1");
  if (!raw) return;
  const userIds = raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
  if (userIds.length === 0) {
    errorMsg.value = "请输入有效的用户ID";
    return;
  }
  try {
    await addProjectAdminApi({
      projectId: item.id,
      userIds
    });
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "分配成员失败";
  }
}

function prevPage() {
  if (pagination.page <= 1) return;
  pagination.page--;
  void loadData();
}

function nextPage() {
  pagination.page++;
  void loadData();
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.project-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.left,
.right {
  display: flex;
  gap: 8px;
  align-items: center;
}

input,
textarea,
button {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}

button {
  cursor: pointer;
  background: #fff;
}

.error {
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
  padding: 8px 10px;
  border-radius: 6px;
}

.project-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.project-table th,
.project-table td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
}

.project-table th {
  background: #f3f4f6;
}

.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.empty {
  text-align: center;
  color: #6b7280;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pager {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
}

.dialog {
  width: min(560px, 90vw);
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

