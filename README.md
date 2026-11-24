# 安护评估｜住户综合评估系统

[English](#comprehensive-assessment-system) | [简体中文](#安护评估住户综合评估系统)

养老机构住户综合评估、风险提示与照护方案工作流的开源原型，依据《综合评估系统 PRD》整理。当前版本以可解释、可追溯为优先：对 PRD 明确定义的 ADL 选项进行计分；对于业务规则不完整或有歧义之处明确提示“待确认”，不自动推断最终照护等级。

> **重要：这是本地演示原型，不是生产系统。不要录入真实住户姓名、健康信息或其他个人数据。** 当前没有登录、角色权限、服务端加密、审计日志、备份与生产级工作流，不能用于真实机构运营、临床判断或正式照护决策。

## 当前功能

- 评估总览、住户演示档案和本地评估记录。
- 七类评估量表：照护需求、ADL、精神状态、感知觉与沟通、社会参与、异常精神行为、补充信息；另有基本信息分区。
- ADL 分项计分、总分和 PRD 已定义的分级；未定义分数区间标为“规则待确认”。
- 依据 PRD 列出的部分条件生成可解释的草案风险提示；照护等级不自动推荐。
- 草稿编辑、提交审核、演示确认及已确认报告打印 / 保存 PDF。
- 表单数据保存在当前浏览器 `localStorage`；无服务端写入。
- 对评分、未完成项、风险提示与区间边界的自动化测试。

## 本地运行

需要 Node.js 18 或更高版本；无需安装第三方依赖。

```bash
npm start
```

访问 <http://127.0.0.1:4173>。运行测试：

```bash
npm test
```

清除本机演示数据：在浏览器开发者工具的 Console 中运行 `localStorage.removeItem("anhui-assessment-demo-v1")` 后刷新页面。

## 规则边界

PRD 标明了若干待业务确认事项：照护等级条件的 AND / OR 关系与优先级、指标 46/47 的含义、ADL 未定义分数区间、量表组合分级，以及风险规则中相互重叠的条件。本原型不解决这些业务决策。

本次输入未包含 PRD 引用的原始评估工作簿，因此“照护需求”分区只有部分指标占位，不可视为完整量表。正式开发前，机构业务负责人应提供经审核的表单、逐项评分条件、风险规则、服务包与报告模板，并签署规则版本和生效流程。

## 生产化前的必要工作

在处理任何真实个人或健康数据之前，需单独设计并评审：身份认证与机构隔离、基于角色的最小权限、传输和静态加密、审计与导出日志、备份和保留期限、服务端可靠保存、并发与更正流程、安全测试、合规要求，以及规则版本审批与历史快照。当前原型不提供这些能力。

## 技术

- 原生 JavaScript ES modules、HTML 与 CSS，无运行时第三方依赖。
- 基于 Node.js 内置 HTTP 模块的轻量本地静态服务器。
- `node:test` 覆盖计分区间、缺项处理、风险条件和完成度。

## 许可证

MIT，详见 [LICENSE](LICENSE)。

---

# Comprehensive Assessment System

[English](#comprehensive-assessment-system) | [简体中文](#安护评估住户综合评估系统)

An open-source prototype for comprehensive resident assessments, risk prompts, and care-planning workflows in elder-care facilities. It is based on the Comprehensive Assessment System PRD. The current version prioritizes explainability and traceability: it scores ADL items defined in the PRD and flags incomplete or ambiguous rules as “Rules pending confirmation” rather than inferring a final care level.

> **Important: This is a local demo prototype, not a production system. Do not enter real resident names, health information, or other personal data.** It does not provide authentication, role-based access, server-side encryption, audit logs, backups, or production-ready workflows. It must not be used for real facility operations, clinical judgment, or formal care decisions.

## Features

- Assessment dashboard, demo resident profiles, and local assessment records.
- Seven assessment form sections: care needs, activities of daily living (ADL), mental status, sensory and communication, social participation, behavioral symptoms, and supplementary information. Basic assessment details are provided separately.
- ADL item scoring, totals, and the grading bands defined in the PRD. Undefined score ranges are marked “Rules pending confirmation.”
- Explainable draft risk prompts based on selected PRD criteria. The system does not automatically recommend a care level.
- Draft editing, demo review and confirmation flow, and printing or saving confirmed demo reports as PDF.
- Form data is stored in this browser’s `localStorage`; nothing is sent to a server.
- Automated tests for scoring, incomplete inputs, risk prompts, and assessment completion.

## Run locally

Requires Node.js 18 or later. No third-party dependencies are needed.

```bash
npm start
```

Open <http://127.0.0.1:4173>. Run the tests with:

```bash
npm test
```

To clear local demo data, run `localStorage.removeItem("anhui-assessment-demo-v1")` in the browser developer console, then refresh the page.

## Rules and limitations

The PRD identifies several business rules that still need confirmation, including AND/OR relationships and priority for care-level criteria, the meaning of items 46/47, undefined ADL score ranges, combined grading rules for other scales, and overlapping risk conditions. This prototype does not resolve those business decisions.

The source assessment workbook referenced by the PRD was not included in the materials provided. Consequently, the care-needs section contains only partial indicator placeholders and is not a complete assessment form. Before production development, facility stakeholders should provide approved forms, item-level scoring criteria, risk rules, service packages, and report templates, and approve rule versions and their effective dates.

## Required before production use

Before handling real personal or health data, separately design and review authentication and facility isolation, least-privilege role-based access, encryption in transit and at rest, audit and export logs, backups and retention periods, reliable server-side persistence, concurrency and correction workflows, security testing, compliance requirements, and approval and snapshotting of rule versions. This prototype does not provide these capabilities.

## Technology

- Native JavaScript ES modules, HTML, and CSS, with no runtime third-party dependencies.
- Lightweight local static server built with Node.js’s built-in HTTP module.
- `node:test` tests for score ranges, missing inputs, risk criteria, and completion status.

## License

MIT. See [LICENSE](LICENSE).
