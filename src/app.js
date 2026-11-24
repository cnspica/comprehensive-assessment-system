import { ADL_ITEMS, SECTIONS, STATUS_LABELS, calculateAdl, calculateRisks, sectionCompletion } from "./rules.js";

const STORAGE_KEY = "anhui-assessment-demo-v1";
const DEMO_RESIDENTS = [
  {
    id: "demo-1", name: "林女士", age: 82, room: "A-208", assessmentDate: "2026-11-20", assessor: "周评估员",
    scene: "定期复评", status: "review", updatedAt: "2026-11-20",
    answers: { assessmentDate: "2026-11-20", assessor: "周评估员", scene: "定期复评", adl_eating: 10, adl_bathing: 0, adl_grooming: 5, adl_dressing: 5, adl_toileting: 5, adl_bowel: 10, adl_bladder: 5, adl_transfer: 10, adl_walking: 10, adl_stairs: 5, consciousness: "3", vision: "1", hearing: "1", depression: "0" },
  },
  {
    id: "demo-2", name: "陈先生", age: 76, room: "B-116", assessmentDate: "2026-11-18", assessor: "李评估员",
    scene: "入住评估", status: "draft", updatedAt: "2026-11-18", answers: { assessmentDate: "2026-11-18", assessor: "李评估员", scene: "入住评估" },
  },
];

let state = loadState();
let activePage = "dashboard";
let activeResidentId = null;
let activeSection = "basic";
let toastTimer;

const view = document.querySelector("#view");
const breadcrumb = document.querySelector("#breadcrumb-current");

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error("Could not read local demo data", error);
  }
  return DEMO_RESIDENTS;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save local demo data", error);
    showToast("保存失败。请检查浏览器存储空间后重试。");
    return false;
  }
  return true;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function statusPill(status) {
  return `<span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] ?? status)}</span>`;
}

function counts() {
  return {
    residents: state.length,
    draft: state.filter((resident) => resident.status === "draft" || resident.status === "returned").length,
    review: state.filter((resident) => resident.status === "review").length,
  };
}

function renderDashboard() {
  breadcrumb.textContent = "评估总览";
  const summary = counts();
  const rows = [...state].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 5);
  view.innerHTML = `
    <div class="page-heading">
      <div><div class="eyebrow">OVERVIEW</div><h1>住户综合评估</h1><p class="subheading">管理评估进度，查看待审核记录与规则状态。</p></div>
      <button class="button button-secondary" data-action="show-rules">查看规则状态</button>
    </div>
    <div class="summary-cards">
      <div class="summary-card"><span>演示住户</span><strong>${summary.residents}</strong><small>本地浏览器中的住户档案</small></div>
      <div class="summary-card"><span>草稿待完善</span><strong>${summary.draft}</strong><small>包含退回待补充的记录</small></div>
      <div class="summary-card"><span>待审核</span><strong>${summary.review}</strong><small>尚未由授权人员确认</small></div>
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading"><div><h2>最近评估</h2><p>按最近更新排序</p></div><button class="text-button" data-action="show-residents">全部住户 →</button></div>
        ${rows.length ? `<div class="resident-list">${rows.map((resident) => `
          <div class="resident-row">
            <button class="resident-info plain-button" data-action="open-resident" data-id="${escapeHtml(resident.id)}">
              <span class="avatar">${escapeHtml(resident.name.slice(0, 1))}</span>
              <span><strong>${escapeHtml(resident.name)} <span class="muted-inline">${escapeHtml(resident.room ?? "未填写")}</span></strong><small>${escapeHtml(resident.scene ?? "评估记录")} · ${escapeHtml(resident.assessor ?? "未填写评估人")}</small></span>
            </button>
            <span class="row-date">${escapeHtml(resident.updatedAt ?? "—")}</span>
            ${statusPill(resident.status)}
          </div>`).join("")}</div>` : `<div class="empty-state"><div class="empty-icon">＋</div><h3>还没有评估记录</h3><p>新建一个演示评估以开始使用。</p><button class="button button-primary" data-action="new-assessment">新建评估</button></div>`}
      </section>
      <section class="panel">
        <div class="panel-heading"><div><h2>规则状态</h2><p>尚未完成业务确认的关键规则</p></div></div>
        <div class="rule-list">
          <div class="rule-line"><span>ADL 计分与分级</span><span>部分可计算</span></div>
          <div class="rule-line"><span>照护等级推荐</span><span>待确认</span></div>
          <div class="rule-line"><span>风险识别条件</span><span>草案</span></div>
          <div class="rule-line"><span>感知觉 / 精神状态分级</span><span>待确认</span></div>
        </div>
        <div class="rule-summary">依据 PRD 中明确列出的规则运行。规则冲突、区间缺失或组合条件不完整时，不自动判档。</div>
      </section>
    </div>
    <div class="notice" style="margin-top:18px"><span class="notice-icon">⚠</span><div><strong>隐私提示</strong><br>当前版本没有登录、服务端访问控制、加密存储或审计日志。仅使用虚构演示数据；不可录入真实住户身份、健康或照护信息。</div></div>`;
}

function renderResidents(filter = "") {
  breadcrumb.textContent = "住户档案";
  const matches = state.filter((resident) => `${resident.name} ${resident.room ?? ""}`.toLowerCase().includes(filter.toLowerCase()));
  view.innerHTML = `
    <div class="page-heading"><div><div class="eyebrow">RESIDENTS</div><h1>住户档案</h1><p class="subheading">仅限本地演示数据；每位住户可建立多次评估记录。</p></div><button class="button button-primary" data-action="new-assessment">＋ 新建评估</button></div>
    <div class="list-toolbar"><input class="search-input" id="resident-search" type="search" placeholder="搜索姓名或房间号" value="${escapeHtml(filter)}" /></div>
    <section class="panel">
      ${matches.length ? `<table class="residents-table"><thead><tr><th>住户</th><th>房间</th><th>年龄</th><th>最近评估</th><th>状态</th><th></th></tr></thead><tbody>${matches.map((resident) => `
        <tr><td><strong>${escapeHtml(resident.name)}</strong></td><td>${escapeHtml(resident.room ?? "—")}</td><td>${resident.age ? `${escapeHtml(resident.age)} 岁` : "—"}</td><td>${escapeHtml(resident.updatedAt ?? "—")}</td><td>${statusPill(resident.status)}</td><td><button class="text-button" data-action="open-resident" data-id="${escapeHtml(resident.id)}">打开 →</button></td></tr>`).join("")}</tbody></table>` :
        `<div class="empty-state"><div class="empty-icon">⌕</div><h3>${state.length ? "没有匹配的住户" : "暂无住户档案"}</h3><p>尝试修改搜索词，或新建一条演示评估。</p></div>`}
    </section>`;
  document.querySelector("#resident-search")?.addEventListener("input", (event) => renderResidents(event.target.value));
}

function field({ key, label, type = "select", options = [], help = "", full = false, required = false, placeholder = "", value: fieldValue }, answers) {
  const value = fieldValue ?? answers[key] ?? "";
  const safeKey = escapeHtml(key);
  const labelHtml = `${escapeHtml(label)}${required ? "" : ' <span class="optional">（选填）</span>'}`;
  let control;
  if (type === "textarea") {
    control = `<textarea data-field="${safeKey}" maxlength="${type === "textarea" ? 500 : 100}">${escapeHtml(value)}</textarea>`;
  } else if (type === "number") {
    control = `<input data-field="${safeKey}" type="number" min="0" max="120" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />`;
  } else if (type === "text" || type === "date") {
    control = `<input data-field="${safeKey}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />`;
  } else {
    control = `<select data-field="${safeKey}"><option value="">请选择</option>${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select>`;
  }
  return `<div class="field ${full ? "full" : ""}"><label>${labelHtml}</label>${control}${help ? `<div class="field-help">${escapeHtml(help)}</div>` : ""}</div>`;
}

const yesNo = [["no", "否"], ["yes", "是"]];
const assessmentFields = {
  basic: (answers) => `
    <div class="form-grid">
      ${field({ key: "assessmentDate", label: "评估日期", type: "date", required: true }, answers)}
      ${field({ key: "assessor", label: "评估人员", type: "text", required: true, placeholder: "填写虚构演示名称" }, answers)}
      ${field({ key: "scene", label: "评估场景", required: true, options: [["入住评估", "入住评估"], ["定期复评", "定期复评"], ["专项复评", "专项复评"], ["其他", "其他"]] }, answers)}
      ${field({ key: "residentAge", label: "住户年龄（岁）", type: "number", help: "用于 PRD 中列明的年龄风险阈值。" }, answers)}
      ${field({ key: "residentName", label: "演示住户姓名", type: "text", help: "系统预置为虚构示例；请勿填写真实身份信息。" }, answers)}
      ${field({ key: "residentRoom", label: "房间（演示）", type: "text" }, answers)}
      ${field({ key: "assessmentNote", label: "评估补充说明", type: "textarea", full: true, help: "最多 500 字。不要输入可识别个人身份的内容。" }, answers)}
    </div>`,
  care: (answers) => {
    const items = [
      ["care_7", "指标 7（原表题目待补）", yesNo],
      ["care_8", "指标 8（原表题目待补）", yesNo],
      ["care_9", "指标 9（原表题目待补）", yesNo],
      ["care_10", "指标 10（原表题目待补）", yesNo],
      ["care_11_15", "指标 11–15 任一项（原表题目待补）", yesNo],
      ["care_16", "指标 16（原表题目待补）", yesNo],
      ["care_20_21", "指标 20 / 21（组合规则待确认）", yesNo],
      ["care_25_27", "指标 25–27 是否均为“是”", [["no", "否"], ["yes", "是"], ["unknown", "未确认"]] ],
      ["care_30_34", "指标 30–34 关键项（原表题目待补）", yesNo],
      ["care_45", "指标 45（原表题目待补）", yesNo],
      ["care_46", "指标 46 失禁频次", [["none", "无"], ["once", "≤1 次 / 周"], ["twice", "≥2 次 / 周"], ["unknown", "规则待确认"]] ],
      ["care_47", "指标 47 失禁频次", [["none", "无"], ["once", "≤1 次 / 周"], ["twice", "≥2 次 / 周"], ["unknown", "规则待确认"]] ],
      ["care_48", "指标 48（原表题目待补）", yesNo],
      ["care_54_55", "指标 54 / 55（原表题目待补）", yesNo],
    ];
    return `<div class="form-grid">${items.map(([key, label, options]) => field({ key, label, options }, answers)).join("")}
      ${field({ key: "uses_aid", label: "使用辅具", options: [["no", "否"], ["yes", "是"], ["help", "需要帮助"]], help: "原始指标 31 的具体语义待核对。" }, answers)}
      ${field({ key: "catheter", label: "使用尿管", options: yesNo }, answers)}
      ${field({ key: "feeding_tube", label: "使用管饲", options: yesNo }, answers)}
    </div>
    <p class="inline-note">PRD 未附原始工作簿。以上为指标占位，不是完整评估表；此表单不会生成照护等级推荐。</p>`;
  },
  adl: (answers) => `<div class="form-grid">${ADL_ITEMS.map(({ key, label, options }) => field({ key, label, options: options.map(([score, description]) => [score, `${description} · ${score} 分`]), required: true }, answers)).join("")}</div>
    <p class="field-help" style="margin-top:16px">计分选项依 PRD 转录。源表未定义 41–44、61–64 分的分级，本原型会将其标记为“规则待确认”。</p>`,
  mental: (answers) => `<div class="form-grid">
    ${field({ key: "cognition", label: "认知测试原始分", type: "number", help: "测试结果到 0/1/2 分映射未确认；仅记录原始分。" }, answers)}
    ${field({ key: "cognition_score", label: "经确认的认知评分", options: [["0", "0"], ["1", "1"], ["2", "2"], ["unknown", "未确认"]], help: "仅在使用机构已批准规则完成映射后填写。" }, answers)}
    ${field({ key: "aggression", label: "攻击行为（观察记录）", options: [["0", "无 / 未观察到"], ["1", "有，程度待专业确认"], ["2", "有明显表现（记录值）"], ["unknown", "待评估"]] }, answers)}
    ${field({ key: "depression", label: "抑郁症状（观察记录）", options: [["0", "无 / 未观察到"], ["1", "有，程度待专业确认"], ["2", "有明显表现（记录值）"], ["unknown", "待评估"]] }, answers)}
    ${field({ key: "mental_note", label: "补充观察", type: "textarea", full: true }, answers)}
    </div><p class="inline-note">精神状态分级与认知测试映射不完整；此处记录不代表诊断或自动分级。</p>`,
  sensory: (answers) => `<div class="form-grid">
    ${field({ key: "consciousness", label: "意识水平（源表编码）", options: [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["unknown", "未评估"]], help: "按原量表编码记录；分级组合规则待确认。" }, answers)}
    ${field({ key: "vision", label: "视力（源表编码）", options: [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["unknown", "未评估"]] }, answers)}
    ${field({ key: "hearing", label: "听力（源表编码）", options: [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["unknown", "未评估"]] }, answers)}
    ${field({ key: "communication", label: "沟通交流（源表编码）", options: [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["unknown", "未评估"]] }, answers)}
    </div><p class="inline-note">PRD 提及按组合条件分 0–3 级，但未提供完整组合规则，因此不自动生成分级。</p>`,
  social: (answers) => `<div class="form-grid">
    ${["life_ability", "work_ability", "time_orientation", "space_orientation", "person_orientation", "social_ability"].map((key, index) => field({ key, label: ["生活能力", "工作能力", "时间定向", "空间定向", "人物定向", "社会交往能力"][index], options: [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["unknown", "未评估"]] }, answers)).join("")}
    </div><p class="inline-note">原表各项分值定义及组合规则未完整提供。方向定向等字段仅作为记录，不自动计算总分或等级。</p>`,
  behavior: (answers) => `<div class="form-grid">
    ${field({ key: "behavior_recent", label: "近 30 天是否发生异常精神行为", options: [["no", "否"], ["yes", "是"], ["unknown", "未评估"]], required: true }, answers)}
    ${answers.behavior_recent === "yes" ? field({ key: "behavior_frequency", label: "近一周发生频率", options: [["none", "无"], ["1-3", "1–3 天"], ["4-7", "4–7 天"]], required: true }, answers) : field({ key: "behavior_frequency", label: "近一周发生频率", options: [["none", "无"], ["1-3", "1–3 天"], ["4-7", "4–7 天"]], help: "选择“是”后记录频率。" }, answers)}
    ${field({ key: "behavior_types", label: "行为类型", type: "text", placeholder: "可选" }, answers)}
    ${field({ key: "behavior_description", label: "行为描述（最多 40 字）", type: "text", full: true, placeholder: "请勿填写可识别身份的信息" }, answers)}
    </div>`,
  supplement: (answers) => `<div class="form-grid">
    ${field({ key: "diagnoses", label: "疾病诊断 / 相关病史", type: "textarea", full: true, help: "演示时请使用虚构内容。" }, answers)}
    ${field({ key: "incident_year", label: "近一年意外发生情况", options: [["no", "无"], ["yes", "有"], ["unknown", "未评估"]] }, answers)}
    ${field({ key: "incident_month", label: "近一月意外发生情况", options: [["no", "无"], ["yes", "有"], ["unknown", "未评估"]] }, answers)}
    ${field({ key: "recent_discharge", label: "近一月出院 / 疾病恢复", options: [["no", "无"], ["yes", "有"], ["unknown", "未评估"]] }, answers)}
    ${field({ key: "has_tube", label: "存在管路", options: yesNo }, answers)}
    ${field({ key: "tube_risk", label: "脱管风险（评估者勾选）", options: yesNo }, answers)}
    ${field({ key: "self_harm", label: "是否观察到自伤 / 自杀行为", options: yesNo }, answers)}
    </div>`
};

function residentById(id) { return state.find((resident) => resident.id === id); }

function renderAssessment(id, sectionId = activeSection) {
  const resident = residentById(id);
  if (!resident) { renderDashboard(); return; }
  activeResidentId = id;
  activeSection = sectionId;
  breadcrumb.textContent = "住户评估";
  const answers = resident.answers ?? (resident.answers = {});
  answers.residentAge ??= resident.age ?? "";
  answers.residentName ??= resident.name ?? "";
  answers.residentRoom ??= resident.room ?? "";
  const adl = calculateAdl(answers);
  const { risks } = calculateRisks(answers, answers.residentAge || resident.age);
  const section = SECTIONS.find((item) => item.id === sectionId) ?? SECTIONS[0];
  const completion = sectionCompletion(section.id, answers);
  const completedSections = SECTIONS.filter((item) => sectionCompletion(item.id, answers).complete).length;
  const completionRate = Math.round(completedSections / SECTIONS.length * 100);
  const allSectionsComplete = SECTIONS.every((item) => sectionCompletion(item.id, answers).complete);
  const statusControl = resident.status === "confirmed"
    ? `<span class="status-pill status-confirmed">已确认 · 不可覆盖</span>`
    : resident.status === "review"
      ? `<button class="button button-primary" data-action="confirm" data-id="${escapeHtml(id)}" ${allSectionsComplete ? "" : "disabled"}>${allSectionsComplete ? "确认评估" : "待完善后确认"}</button>`
      : `<button class="button button-secondary" data-action="submit-review" data-id="${escapeHtml(id)}">提交审核</button>`;

  view.innerHTML = `
    <div class="assessment-header">
      <button class="back-button" data-action="back-dashboard" aria-label="返回总览">←</button>
      <div class="avatar">${escapeHtml(resident.name.slice(0, 1))}</div>
      <div class="assessment-title"><h1>${escapeHtml(resident.name)} <span class="muted-inline">${escapeHtml(answers.residentRoom || resident.room || "演示住户")}</span></h1><p>${resident.age ? `${escapeHtml(answers.residentAge || resident.age)} 岁 · ` : ""}${escapeHtml(resident.scene ?? "新建评估")} · ${escapeHtml(answers.assessmentDate || resident.assessmentDate || "未填写日期")}</p></div>
      ${statusPill(resident.status)}
    </div>
    <div class="section-nav">${SECTIONS.map((item) => `<button class="section-tab ${item.id === section.id ? "active" : ""}" data-action="section" data-section="${item.id}">${escapeHtml(item.title)}${sectionCompletion(item.id, answers).complete ? '<span class="tab-check">✓</span>' : ""}</button>`).join("")}</div>
    <div class="assessment-layout">
      <section class="panel form-panel">
        <div class="section-heading"><div><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.description)}</p></div><span class="completion-label">${completion.completed}/${completion.total || "—"} 项</span></div>
        ${section.pending ? `<div class="notice" style="margin:0 0 17px"><span class="notice-icon">ⓘ</span><div><strong>规则尚未确认</strong><br>该分区仅供演示记录；系统不会据此自动给出分级或等级。</div></div>` : ""}
        ${assessmentFields[section.id](answers)}
        <div class="form-actions"><span class="mini-text">输入自动保存到本地浏览器</span><div class="form-actions-right"><button class="button button-secondary" data-action="save">保存草稿</button>${statusControl}</div></div>
      </section>
      <aside class="assessment-aside">
        <section class="panel score-card">
          <h3>评估进度</h3><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span class="mini-text">${completedSections} / ${SECTIONS.length} 个分区完整</span><span class="mini-text">${completionRate}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${completionRate}%"></div></div>
          <div class="score-total"><span>ADL 总分</span><strong>${adl.score ?? "—"}<span style="font-size:10px;font-weight:400"> / 100</span></strong></div>
          <div class="score-total"><span>ADL 分级</span><strong style="font-size:11px">${escapeHtml(adl.level)}</strong></div>
          ${adl.level === "规则待确认" ? `<div class="score-unresolved">该分值区间在源资料中未定义，系统不自动判级。</div>` : ""}
          <div class="score-total"><span>照护等级</span><strong style="font-size:10px;color:#98702e">待规则确认</strong></div>
          <div class="score-unresolved">PRD 中等级组合、优先级及多个边界条件尚未确认。</div>
        </section>
        <section class="panel score-card"><h3>风险提示 <span class="mini-text">· 草案</span></h3>
          ${risks.length ? `<ul class="trigger-list">${risks.map((risk) => `<li><strong>${escapeHtml(risk.name)}</strong><br>${escapeHtml(risk.basis)}</li>`).join("")}</ul>` : `<p class="mini-text" style="line-height:1.7">填写相关字段后显示符合源资料触发条件的风险提示。</p>`}
          <div class="inline-note">PRD 中风险条件仍有冲突或待确认项。以上提示不能作为最终评估结论。</div>
        </section>
        <section class="panel score-card"><h3>评估状态</h3>${statusPill(resident.status)}<p class="mini-text" style="margin:11px 0 0;line-height:1.7">${resident.status === "confirmed" ? "已确认记录不可覆盖；复评需创建新记录。" : "推荐结果在授权人员确认前不代表最终等级。"}</p>
        ${resident.status === "confirmed" ? `<button class="button button-secondary" style="width:100%;margin-top:12px" data-action="print-report" data-id="${escapeHtml(id)}">打印报告</button>` : ""}</section>
      </aside>
    </div>`;

  if (resident.status === "confirmed") {
    view.querySelectorAll("[data-field]").forEach((control) => { control.disabled = true; });
  }
  view.querySelectorAll("[data-field]").forEach((control) => {
    control.addEventListener("input", () => updateField(control));
    control.addEventListener("change", () => updateField(control));
  });
}

function updateField(control) {
  const resident = residentById(activeResidentId);
  if (!resident || resident.status === "confirmed") return;
  resident.answers ??= {};
  const value = control.value;
  const key = control.dataset.field;
  if (key === "behavior_description" && value.length > 40) {
    control.value = value.slice(0, 40);
    showToast("行为描述最多 40 字。");
  }
  resident.answers[key] = control.type === "number" && value !== "" ? Number(value) : control.value;
  if (key === "residentAge") resident.age = resident.answers[key] || resident.age;
  if (key === "residentName") resident.name = resident.answers[key] || resident.name;
  if (key === "residentRoom") resident.room = resident.answers[key] || resident.room;
  if (key === "assessmentDate") resident.assessmentDate = resident.answers[key];
  if (key === "assessor") resident.assessor = resident.answers[key];
  if (key === "scene") resident.scene = resident.answers[key];
  resident.updatedAt = new Date().toISOString().slice(0, 10);
  saveState();
  if (key === "behavior_recent") renderAssessment(activeResidentId, activeSection);
  else refreshAssessmentSummary();
}

function refreshAssessmentSummary() {
  if (!activeResidentId) return;
  const resident = residentById(activeResidentId);
  if (!resident) return;
  const adl = calculateAdl(resident.answers);
  const { risks } = calculateRisks(resident.answers, resident.answers.residentAge || resident.age);
  const scorePanel = view.querySelector(".assessment-aside");
  if (!scorePanel) return;
  const sections = SECTIONS.filter((item) => sectionCompletion(item.id, resident.answers).complete).length;
  const progress = Math.round(sections / SECTIONS.length * 100);
  const progressLabel = scorePanel.querySelector(".score-card .mini-text");
  if (progressLabel) progressLabel.textContent = `${sections} / ${SECTIONS.length} 个分区完整`;
  const fill = scorePanel.querySelector(".progress-fill");
  if (fill) fill.style.width = `${progress}%`;
  const progressPercent = scorePanel.querySelector(".progress-track")?.previousElementSibling?.querySelector("span:last-child");
  if (progressPercent) progressPercent.textContent = `${progress}%`;
  const totals = scorePanel.querySelectorAll(".score-total strong");
  if (totals[0]) totals[0].innerHTML = `${adl.score ?? "—"}<span style="font-size:10px;font-weight:400"> / 100</span>`;
  if (totals[1]) totals[1].textContent = adl.level;
  const riskList = scorePanel.querySelector(".trigger-list");
  if (riskList) riskList.remove();
  const riskText = scorePanel.querySelector(".score-card:nth-child(2) p");
  if (risks.length) {
    if (riskText) riskText.remove();
    const list = document.createElement("ul");
    list.className = "trigger-list";
    list.innerHTML = risks.map((risk) => `<li><strong>${escapeHtml(risk.name)}</strong><br>${escapeHtml(risk.basis)}</li>`).join("");
    scorePanel.querySelector(".score-card:nth-child(2) h3").after(list);
  }
}

function renderRules() {
  breadcrumb.textContent = "规则说明";
  view.innerHTML = `
    <div class="page-heading"><div><div class="eyebrow">RULEBOOK</div><h1>规则说明</h1><p class="subheading">本原型只实现 PRD 明确列出的计算；待确认规则不会静默补值。</p></div></div>
    <div class="notice" style="margin-bottom:16px"><span class="notice-icon">⚠</span><div><strong>上线阻塞项</strong><br>PRD 明确列出的业务确认问题未解决前，不应将规则用于正式生产评估或自动决策。</div></div>
    <div class="rules-content">
      <article class="panel rule-card"><span class="rule-tag">已按 PRD 实现</span><h3>ADL 计分</h3><p>十个项目的分值选项和总分计算。总分区间：≤40 重度；45–60 中度；65–95 轻度；100 能力完好。</p><p>41–44、61–64 分显示“规则待确认”，不会强行映射等级。</p></article>
      <article class="panel rule-card"><span class="rule-tag">待业务确认</span><h3>照护等级推荐</h3><p>PRD 的等级触发条件尚未明确 AND / OR 关系、优先级及边界定义。本原型不自动推荐照护等级，需授权人员依据经审批规则作出判断。</p></article>
      <article class="panel rule-card"><span class="rule-tag">草案提示</span><h3>风险识别</h3><p>根据 PRD 已列出的条件展示初步风险提示；源资料中存在重叠、条件组合和解释待确认项。每条提示均非诊断，也不构成最终风险结论。</p></article>
      <article class="panel rule-card"><span class="rule-tag">未实现判级</span><h3>其他量表</h3><p>精神状态认知映射、感知觉与沟通组合分级、社会参与各项计分依据未完整提供，因此只记录字段，不计算等级。</p></article>
      <article class="panel rule-card"><span class="rule-tag">必须补齐</span><h3>原始表单与规则版本</h3><p>源工作簿未包含在本次输入中。照护需求题目以指标占位展示，不能视为完整表单。正式启用前需核对题目、分值、适用条件和审核记录。</p></article>
      <article class="panel rule-card"><span class="rule-tag">原型限制</span><h3>隐私与审核</h3><p>数据以明文保存在当前浏览器本地，无账号、角色权限、服务端审计或加密机制。状态流转只用于交互演示，不满足医疗 / 照护机构生产环境的隐私与合规要求。</p></article>
    </div>
    <section class="panel rule-card" style="margin-top:14px"><h3>ADL 计分依据</h3><ul>${ADL_ITEMS.map((item) => `<li>${escapeHtml(item.label)}：${item.options.map(([score]) => score).join(" / ")} 分</li>`).join("")}</ul></section>`;
}

function renderPage() {
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === activePage));
  if (activePage === "assessment" && activeResidentId) renderAssessment(activeResidentId, activeSection);
  else if (activePage === "residents") renderResidents();
  else if (activePage === "rules") renderRules();
  else renderDashboard();
}

function openNewAssessment() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <form class="modal" id="new-assessment-form">
      <h2>新建演示评估</h2><p>请使用虚构信息。此原型没有生产级访问控制与加密存储。</p>
      <div class="modal-grid">
        <div class="field"><label>住户姓名（虚构）</label><input name="name" required maxlength="30" placeholder="例如：王女士" /></div>
        <div class="field"><label>年龄</label><input name="age" type="number" min="1" max="120" /></div>
        <div class="field"><label>房间（演示）</label><input name="room" maxlength="20" placeholder="例如：A-101" /></div>
        <div class="field"><label>评估场景</label><select name="scene"><option>入住评估</option><option>定期复评</option><option>专项复评</option><option>其他</option></select></div>
      </div>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">取消</button><button type="submit" class="button button-primary">创建评估</button></div>
    </form>`;
  document.body.append(modal);
  modal.querySelector('input[name="name"]').focus();
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.remove(); });
  modal.querySelector("[data-action='close-modal']").addEventListener("click", () => modal.remove());
  modal.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name")).trim();
    if (!name) return;
    const id = `assessment-${Date.now()}`;
    const date = new Date().toISOString().slice(0, 10);
    const resident = {
      id, name, age: Number(formData.get("age")) || null, room: String(formData.get("room")).trim(),
      scene: String(formData.get("scene")), assessmentDate: date, updatedAt: date, status: "draft",
      answers: { assessmentDate: date, scene: String(formData.get("scene")), residentName: name, residentAge: Number(formData.get("age")) || "", residentRoom: String(formData.get("room")).trim() },
    };
    state.unshift(resident);
    if (!saveState()) { state = state.filter((item) => item.id !== id); return; }
    modal.remove();
    activePage = "assessment";
    activeSection = "basic";
    activeResidentId = id;
    renderPage();
    showToast("演示评估已创建。");
  });
}

function submitReview(id) {
  const resident = residentById(id);
  if (!resident || resident.status === "confirmed") return;
  const missing = SECTIONS.filter((section) => !sectionCompletion(section.id, resident.answers).complete).map((section) => section.title);
  if (missing.length) {
    showToast(`仍有未完成分区：${missing.slice(0, 3).join("、")}${missing.length > 3 ? "…" : ""}`);
    return;
  }
  resident.status = "review";
  resident.updatedAt = new Date().toISOString().slice(0, 10);
  if (saveState()) { renderAssessment(id); showToast("已提交审核（演示流程）。"); }
}

function confirmResident(id) {
  const resident = residentById(id);
  if (!resident || resident.status !== "review") return;
  const missing = SECTIONS.filter((section) => !sectionCompletion(section.id, resident.answers).complete).map((section) => section.title);
  if (missing.length) {
    showToast(`记录尚未完整，不能确认：${missing.slice(0, 3).join("、")}${missing.length > 3 ? "…" : ""}`);
    return;
  }
  resident.status = "confirmed";
  resident.confirmedAt = new Date().toISOString();
  resident.updatedAt = new Date().toISOString().slice(0, 10);
  if (saveState()) { renderAssessment(id); showToast("已确认（演示流程）。"); }
}

function printReport(id) {
  const resident = residentById(id);
  if (!resident || resident.status !== "confirmed") {
    showToast("仅可打印已确认记录。");
    return;
  }
  const adl = calculateAdl(resident.answers);
  const { risks } = calculateRisks(resident.answers, resident.answers.residentAge || resident.age);
  const report = window.open("", "_blank");
  if (!report) { showToast("浏览器阻止了打印窗口，请允许弹出窗口后重试。"); return; }
  report.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>演示评估报告</title>
    <style>body{font:14px Arial,sans-serif;color:#24342d;max-width:760px;margin:40px auto;line-height:1.7}h1{font-size:22px}h2{font-size:16px;margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:7px}.warning{padding:12px;background:#fff8e9;border:1px solid #eedcbb}.row{display:flex;gap:12px;padding:5px 0;border-bottom:1px solid #eee}.label{width:180px;color:#68756f}button{padding:8px 12px}@media print{button{display:none}}</style></head><body>
    <button onclick="window.print()">打印 / 保存 PDF</button><h1>住户综合评估报告（演示）</h1>
    <p class="warning"><strong>原型报告 — 不用于临床或生产决策。</strong><br>本系统没有生产级权限控制、数据加密或审计能力。所有规则仍需机构审核。请勿包含真实个人健康信息。</p>
    <h2>评估信息</h2>
    <div class="row"><span class="label">住户</span>${escapeHtml(resident.name)}</div><div class="row"><span class="label">房间</span>${escapeHtml(resident.room || "—")}</div>
    <div class="row"><span class="label">评估日期 / 评估人</span>${escapeHtml(resident.assessmentDate || "—")} / ${escapeHtml(resident.assessor || "—")}</div>
    <div class="row"><span class="label">状态 / 规则版本</span>已确认（演示） / 草案 0.1</div>
    <h2>量表结果</h2><div class="row"><span class="label">ADL 总分 / 分级</span>${adl.score ?? "未完成"} / ${escapeHtml(adl.level)}</div>
    <div class="row"><span class="label">最终照护等级</span>未生成 — 规则待业务确认</div>
    <h2>风险提示（草案）</h2>${risks.length ? risks.map((risk) => `<div class="row"><span class="label">${escapeHtml(risk.name)}</span>${escapeHtml(risk.basis)}</div>`).join("") : "<p>当前输入未触发已实现的草案条件。</p>"}
    <h2>复核说明</h2><p>已确认时间：${escapeHtml(resident.confirmedAt ?? "—")}。风险条件、失智等级及照护等级规则仍需业务审批。该报告不替代专业人员评估或机构审批。</p></body></html>`);
  report.document.close();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    activePage = button.dataset.page;
    activeResidentId = null;
    renderPage();
  });
});
document.querySelector("#new-assessment").addEventListener("click", openNewAssessment);
view.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id, section } = button.dataset;
  if (action === "new-assessment") openNewAssessment();
  if (action === "show-rules") { activePage = "rules"; renderPage(); }
  if (action === "show-residents") { activePage = "residents"; renderPage(); }
  if (action === "open-resident") { activePage = "assessment"; renderAssessment(id, "basic"); }
  if (action === "section") renderAssessment(activeResidentId, section);
  if (action === "back-dashboard") { activePage = "dashboard"; activeResidentId = null; renderPage(); }
  if (action === "save") { saveState(); showToast("草稿已保存到本地浏览器。"); }
  if (action === "submit-review") submitReview(id);
  if (action === "confirm") confirmResident(id);
  if (action === "print-report") printReport(id);
});

renderPage();
