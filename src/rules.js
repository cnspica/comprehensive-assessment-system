export const ADL_ITEMS = [
  { key: "adl_eating", label: "进食", options: [[10, "独立完成"], [5, "部分帮助"], [0, "完全依赖"]] },
  { key: "adl_bathing", label: "洗澡", options: [[5, "独立完成"], [0, "需要帮助"]] },
  { key: "adl_grooming", label: "修饰", options: [[5, "独立完成"], [0, "需要帮助"]] },
  { key: "adl_dressing", label: "穿脱衣裤鞋袜", options: [[10, "独立完成"], [5, "部分帮助"], [0, "完全依赖"]] },
  { key: "adl_toileting", label: "如厕", options: [[10, "独立完成"], [5, "部分帮助"], [0, "完全依赖"]] },
  { key: "adl_bowel", label: "大便控制", options: [[10, "控制正常"], [5, "偶有失控"], [0, "失控 / 依赖处理"]] },
  { key: "adl_bladder", label: "小便控制", options: [[10, "控制正常"], [5, "偶有失控"], [0, "失控 / 依赖处理"]] },
  { key: "adl_transfer", label: "床椅转移", options: [[15, "独立"], [10, "少量帮助"], [5, "较多帮助"], [0, "不能完成"]] },
  { key: "adl_walking", label: "平地行走", options: [[15, "独立"], [10, "少量帮助"], [5, "轮椅 / 较多帮助"], [0, "不能行走"]] },
  { key: "adl_stairs", label: "上下楼梯", options: [[10, "独立"], [5, "需要帮助"], [0, "不能完成"]] },
];

export const SECTIONS = [
  { id: "basic", title: "基本信息", description: "评估场景与评估人员信息。住户身份应以机构档案为准。" },
  { id: "care", title: "照护需求", description: "源工作簿的逐题条件未随 PRD 提供；此处记录关键原表指标，不对缺失题目或规则补值。", pending: true },
  { id: "adl", title: "日常生活能力", description: "按 PRD 列明的 ADL 选项计分；41–44、61–64 分区间仍待业务确认。" },
  { id: "mental", title: "精神状态", description: "认知测试映射存在歧义。记录相关观察，但不自动汇总或判级。", pending: true },
  { id: "sensory", title: "感知觉与沟通", description: "记录意识、视力、听力与沟通情况；组合判级规则待业务确认。", pending: true },
  { id: "social", title: "社会参与", description: "原表各项目计分条件未完整提供；本原型不计算总分或能力等级。", pending: true },
  { id: "behavior", title: "异常精神行为", description: "按 PRD 记录近 30 天发生情况及近一周频率。" },
  { id: "supplement", title: "补充信息", description: "记录风险识别所需的补充信息。请仅使用虚构演示数据。" },
];

export const STATUS_LABELS = {
  draft: "草稿",
  review: "待审核",
  returned: "已退回",
  confirmed: "已确认",
};

export function calculateAdl(answers = {}) {
  const values = ADL_ITEMS.map(({ key }) => answers[key]);
  const completed = values.filter((value) => value !== undefined && value !== null && value !== "").length;
  if (completed !== ADL_ITEMS.length) {
    return { complete: false, completed, totalItems: ADL_ITEMS.length, score: null, level: "未完成" };
  }
  const invalidItems = ADL_ITEMS.filter(({ key, options }) => !options.some(([score]) => Number(score) === Number(answers[key]))).map(({ key }) => key);
  if (invalidItems.length) {
    return { complete: false, completed, totalItems: ADL_ITEMS.length, invalidItems, score: null, level: "输入待修正" };
  }
  const score = values.reduce((sum, value) => sum + Number(value), 0);
  let level;
  if (score <= 40) level = "重度受损";
  else if (score >= 45 && score <= 60) level = "中度受损";
  else if (score >= 65 && score <= 95) level = "轻度受损";
  else if (score === 100) level = "能力完好";
  else level = "规则待确认";
  return { complete: true, completed, totalItems: ADL_ITEMS.length, score, level };
}

export function calculateRisks(answers = {}, age = null) {
  const adl = calculateAdl(answers);
  const risks = [];
  const add = (id, name, basis, provisional = false) => risks.push({ id, name, basis, provisional });
  const numeric = (key) => answers[key] === "" || answers[key] == null ? null : Number(answers[key]);
  const ageValue = age === null || age === undefined || age === "" ? null : Number(age);
  const fallTriggers = [];
  if (ageValue !== null && ageValue >= 70) fallTriggers.push(`年龄 ${ageValue} 岁（≥70）`);
  if ([5, 10].includes(numeric("adl_walking"))) fallTriggers.push(`ADL 平地行走 ${numeric("adl_walking")} 分`);
  if ([5, 10].includes(numeric("adl_transfer"))) fallTriggers.push(`ADL 床椅转移 ${numeric("adl_transfer")} 分`);
  if (numeric("adl_toileting") !== null && numeric("adl_toileting") <= 5) fallTriggers.push(`ADL 如厕 ${numeric("adl_toileting")} 分（≤5）`);
  if (numeric("consciousness") !== null && numeric("consciousness") > 1) fallTriggers.push(`意识状态 ${numeric("consciousness")}（>1；源表另有重叠条件）`);
  if (numeric("vision") !== null && numeric("vision") > 1) fallTriggers.push(`视力 ${numeric("vision")}（>1）`);
  if (numeric("depression") !== null && numeric("depression") >= 1) fallTriggers.push(`抑郁症状 ${numeric("depression")}（≥1）`);
  if (fallTriggers.length) add("fall", "跌倒 / 坠床", fallTriggers.join("；"), true);

  const pressureTriggers = [];
  for (const [key, label] of [["adl_walking", "ADL 平地行走"], ["adl_transfer", "ADL 床椅转移"], ["adl_bowel", "ADL 大便控制"], ["adl_bladder", "ADL 小便控制"]]) {
    if ([0, 5].includes(numeric(key))) pressureTriggers.push(`${label} ${numeric(key)} 分`);
  }
  if ([0, 1, 2].includes(numeric("consciousness"))) pressureTriggers.push(`意识状态 ${numeric("consciousness")}`);
  if (pressureTriggers.length) add("pressure", "压疮", pressureTriggers.join("；"), true);

  const chokingTriggers = [];
  if (ageValue !== null && ageValue > 75) chokingTriggers.push(`年龄 ${ageValue} 岁（>75）`);
  if ([0, 1, 2].includes(numeric("consciousness"))) chokingTriggers.push(`意识状态 ${numeric("consciousness")}`);
  if (chokingTriggers.length) add("choking", "噎食 / 呛咳", chokingTriggers.join("；"), true);

  const wanderingTriggers = [];
  if (numeric("time_orientation") !== null && numeric("time_orientation") > 1) wanderingTriggers.push(`时间定向 ${numeric("time_orientation")}（>1）`);
  if (numeric("space_orientation") !== null && numeric("space_orientation") >= 1) wanderingTriggers.push(`空间定向 ${numeric("space_orientation")}（≥1）`);
  if (numeric("cognition_score") !== null && numeric("cognition_score") >= 1) wanderingTriggers.push(`经确认的认知评分 ${numeric("cognition_score")}（≥1）`);
  if (["中度受损", "重度受损"].includes(answers.social_level)) wanderingTriggers.push(`社会参与 ${answers.social_level}`);
  if (wanderingTriggers.length) add("wandering", "走失", wanderingTriggers.join("；"), true);

  if (answers.self_harm === "yes" && numeric("depression") !== null && numeric("depression") >= 1) {
    add("self-harm", "自伤 / 伤人 / 自杀", `行为观察已勾选；抑郁症状 ${numeric("depression")}（≥1）`, true);
  }
  if (answers.has_tube === "yes" && answers.tube_risk === "yes") {
    add("tube", "脱管", "存在管路；评估者已勾选有风险", true);
  }

  return { risks, adl };
}

export function sectionCompletion(sectionId, answers = {}) {
  const requiredBySection = {
    basic: ["assessmentDate", "assessor", "scene"],
    care: ["care_7", "care_8", "care_9", "care_10", "care_11_15", "care_16", "care_20_21", "care_25_27", "care_30_34", "care_45", "care_46", "care_47", "care_48", "care_54_55"],
    adl: ADL_ITEMS.map(({ key }) => key),
    mental: ["cognition", "aggression", "depression"],
    sensory: ["consciousness", "vision", "hearing", "communication"],
    social: ["life_ability", "work_ability", "time_orientation", "space_orientation", "person_orientation", "social_ability"],
    behavior: ["behavior_recent", "behavior_frequency"],
    supplement: ["diagnoses", "incident_year", "incident_month", "recent_discharge", "has_tube", "tube_risk", "self_harm"],
  };
  const keys = sectionId === "behavior" && answers.behavior_recent !== "yes"
    ? ["behavior_recent"]
    : requiredBySection[sectionId] ?? [];
  const completed = keys.filter((key) => answers[key] !== undefined && answers[key] !== "").length;
  return { completed, total: keys.length, complete: keys.length > 0 && completed === keys.length };
}
