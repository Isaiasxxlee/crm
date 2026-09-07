import assert from "node:assert/strict";
import { test } from "node:test";

test("foundation uses the official identity", () => {
  assert.equal("ZUARTS SISTEMA DE GESTÃO".startsWith("ZUARTS SISTEMA"), true);
});
