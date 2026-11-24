import test from "node:test";
import assert from "node:assert/strict";
import { ADL_ITEMS, calculateAdl, calculateRisks, sectionCompletion } from "../src/rules.js";

const completeAnswers = Object.fromEntries(ADL_ITEMS.map(({ key, options }) => [key, options[0][0]]));

test("ADL calculates 100 and labels intact ability", () => {
  const result = calculateAdl(completeAnswers);
  assert.equal(result.score, 100);
  assert.equal(result.level, "能力完好");
  assert.equal(result.complete, true);
});

test("ADL calculates the lower defined boundary", () => {
  const answers = { ...completeAnswers, adl_eating: 0, adl_bathing: 0, adl_grooming: 0, adl_dressing: 0, adl_toileting: 0, adl_bowel: 0, adl_bladder: 0, adl_transfer: 15, adl_walking: 15, adl_stairs: 10 };
  const result = calculateAdl(answers);
  assert.equal(result.score, 40);
  assert.equal(result.level, "重度受损");
});

test("ADL incomplete inputs do not produce a score", () => {
  const result = calculateAdl({});
  assert.equal(result.score, null);
  assert.equal(result.complete, false);
});

test("ADL classifies the next defined boundary at 45", () => {
  const score45 = { ...completeAnswers, adl_eating: 0, adl_bathing: 0, adl_grooming: 0, adl_dressing: 5, adl_toileting: 0, adl_bowel: 0, adl_bladder: 0, adl_transfer: 15, adl_walking: 15, adl_stairs: 10 };
  assert.equal(calculateAdl(score45).score, 45);
  assert.equal(calculateAdl(score45).level, "中度受损");
});

test("ADL rejects values outside the published item options", () => {
  const result = calculateAdl({ ...completeAnswers, adl_eating: 2 });
  assert.equal(result.score, null);
  assert.equal(result.level, "输入待修正");
});

test("explicit self-harm risk requires both behavior and depression criteria", () => {
  assert.equal(calculateRisks({ self_harm: "yes", depression: "0" }).risks.some((risk) => risk.id === "self-harm"), false);
  assert.equal(calculateRisks({ self_harm: "yes", depression: "1" }).risks.some((risk) => risk.id === "self-harm"), true);
});

test("empty age does not trigger age-based risk rules", () => {
  const { risks } = calculateRisks({}, "");
  assert.equal(risks.some((risk) => risk.id === "fall" || risk.id === "choking"), false);
});

test("risk prompts include the actual triggering criterion", () => {
  const { risks } = calculateRisks({}, 82);
  const fall = risks.find((risk) => risk.id === "fall");
  assert.match(fall.basis, /年龄 82 岁/);
});

test("uncompleted assessment sections cannot be submitted as complete", () => {
  assert.equal(sectionCompletion("adl", {}).complete, false);
  assert.equal(sectionCompletion("adl", completeAnswers).complete, true);
});

test("behavior frequency is required only when recent behavior is reported", () => {
  assert.equal(sectionCompletion("behavior", { behavior_recent: "no" }).complete, true);
  assert.equal(sectionCompletion("behavior", { behavior_recent: "yes" }).complete, false);
  assert.equal(sectionCompletion("behavior", { behavior_recent: "yes", behavior_frequency: "4-7" }).complete, true);
});
