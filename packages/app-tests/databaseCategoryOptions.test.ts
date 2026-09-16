import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "vitest";
import { assertCompleteDatabaseCategories, databaseSelectionForCategory } from "../../apps/desktop/src/lib/connection/databaseCategoryOptions.ts";
import { JDBC_PRODUCT_PROFILES } from "../../apps/desktop/src/lib/database/jdbcProductProfiles.ts";
import { CONNECTION_PICKER_OPTIONS } from "../../apps/desktop/src/types/generated/connectionProfiles.ts";

test("database categories cover every option exactly once", () => {
  assert.doesNotThrow(() => assertCompleteDatabaseCategories(["mysql", "redis", "kafka"], [["mysql"], ["redis", "kafka"]]));
  assert.throws(() => assertCompleteDatabaseCategories(["mysql", "redis"], [["mysql"]]), /missing=redis/);
  assert.throws(() => assertCompleteDatabaseCategories(["mysql"], [["mysql"], ["mysql"]]), /duplicates=mysql/);
  assert.throws(() => assertCompleteDatabaseCategories(["mysql"], [["mysql", "unknown"]]), /unknown=unknown/);
});

test("database category changes keep only visible selections", () => {
  assert.equal(databaseSelectionForCategory("mysql", ["mysql", "postgres"]), "mysql");
  assert.equal(databaseSelectionForCategory("mysql", ["questdb", "tdengine"]), "questdb");
  assert.equal(databaseSelectionForCategory("mysql", []), undefined);
});

test("ConnectionDialog database categories stay exhaustive", () => {
  const dialogPath = join(dirname(fileURLToPath(import.meta.url)), "../../apps/desktop/src/components/connection/ConnectionDialog.vue");
  const source = readFileSync(dialogPath, "utf8");
  const optionValues = [...CONNECTION_PICKER_OPTIONS.map((option) => option.value), ...JDBC_PRODUCT_PROFILES.map((profile) => profile.id)];
  const categories = new Set([...CONNECTION_PICKER_OPTIONS.map((option) => option.category), ...JDBC_PRODUCT_PROFILES.map((profile) => profile.category)]);
  const categoryBlocks = [...categories].map((category) => [...CONNECTION_PICKER_OPTIONS.filter((option) => option.category === category).map((option) => option.value), ...JDBC_PRODUCT_PROFILES.filter((profile) => profile.category === category).map((profile) => profile.id)]);

  assert.doesNotThrow(() => assertCompleteDatabaseCategories(optionValues, categoryBlocks));
  assert.match(source, /\.\.\.CONNECTION_PICKER_OPTIONS/);
  assert.match(source, /\.\.\.CONNECTION_PROFILES/);
  assert.match(source, /jdbcProductProfileIdsForCategory\(key\)/);
  assert.match(source, /\.\.\.jdbcProductIconTypes\(\)/);
  assert.ok(optionValues.includes("rabbitmq"), "rabbitmq must remain in dbOptions");
  assert.ok(
    categoryBlocks.some((values) => values.includes("rabbitmq")),
    "rabbitmq must remain categorized",
  );
  assert.ok(optionValues.includes("uxdb"), "uxdb must remain in dbOptions");
  assert.ok(
    categoryBlocks.some((values) => values.includes("uxdb")),
    "uxdb must remain categorized",
  );
});

test("restrictToDbTypes limits the picker to exactly the given database types", () => {
  // This repo has no component-mount test harness (@vue/test-utils is not a
  // dependency and no spec calls mount()), so — like the exhaustiveness test
  // above — the dbCategories behavior is verified two ways: (1) rebuilt from the
  // same real generated option data ConnectionDialog.vue uses, applying the
  // restriction filter exactly as specified (keep only options whose value is
  // in restrictToDbTypes, drop categories left empty, exclude plugin providers
  // entirely), and (2) cross-checked against the component's actual source so
  // this reconstruction can't silently drift from the real implementation.
  const dialogPath = join(dirname(fileURLToPath(import.meta.url)), "../../apps/desktop/src/components/connection/ConnectionDialog.vue");
  const source = readFileSync(dialogPath, "utf8");

  const restrictToDbTypes = ["duckdb"];
  const dbOptions = CONNECTION_PICKER_OPTIONS.filter((option) => option.value !== "influxdb3");
  const categoryKeys = [...new Set(dbOptions.map((option) => option.category))];
  const dbCategories = categoryKeys
    .map((key) => ({
      key,
      options: dbOptions.filter((option) => option.category === key && restrictToDbTypes.includes(option.value)),
    }))
    .filter((category) => category.options.length > 0);

  assert.equal(dbCategories.length, 1, "exactly one category should remain");
  assert.equal(dbCategories[0].options.length, 1, "the surviving category should contain exactly one option");
  assert.equal(dbCategories[0].options[0].value, "duckdb");
  assert.ok(
    !dbCategories.some((category) => category.key === "plugins"),
    "plugin providers must not appear when restrictToDbTypes is set",
  );

  assert.match(source, /restrictToDbTypes\?:\s*readonly DatabaseType\[\]/, "ConnectionDialog should accept a restrictToDbTypes prop");
  assert.match(
    source,
    /!props\.restrictToDbTypes \|\| props\.restrictToDbTypes\.includes\(option\.value as DatabaseType\)/,
    "dbCategories should filter options by restrictToDbTypes",
  );
  assert.match(
    source,
    /if \(props\.restrictToDbTypes\) return categories\.filter\(\(category\) => category\.options\.length > 0\);/,
    "dbCategories should drop empty categories only on the restricted path, and skip plugin providers when restrictToDbTypes is set",
  );
});

test("ConnectionDialog dbCategories applies the empty-category filter only on the restricted path", () => {
  // Guards against the empty-category `.filter()` being hoisted so it runs
  // unconditionally (including on the default/unrestricted path), which would
  // silently drop categories from the default picker if a category ever ended
  // up empty after the (no-op-when-unrestricted) per-option filter predicate.
  // The unrestricted `categories` array must be built with no `.filter()` on
  // it at all, so pluginOptions.push() always operates on the full,
  // unfiltered category list.
  const dialogPath = join(dirname(fileURLToPath(import.meta.url)), "../../apps/desktop/src/components/connection/ConnectionDialog.vue");
  const source = readFileSync(dialogPath, "utf8");
  const computedMatch = source.match(/const dbCategories = computed<DbCategory\[\]>\(\(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(computedMatch, "dbCategories computed block should be found");
  const body = computedMatch[1];
  const restrictedReturnIndex = body.indexOf("if (props.restrictToDbTypes) return categories.filter(");
  assert.ok(restrictedReturnIndex >= 0, "restricted-path early return should filter out empty categories");
  const beforeRestrictedReturn = body.slice(0, restrictedReturnIndex);
  assert.ok(!beforeRestrictedReturn.includes(".filter((category) => category.options.length > 0)"), "the categories array used for the unrestricted path must not be pre-filtered for empty categories");
});
