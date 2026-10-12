/**
 * Unit tests for the generated default names.
 *
 *   npm run test:unit
 *
 * The server and the browser each compute a visitor's name on their own and
 * must agree, and a visitor must keep theirs across visits, so the name has
 * to be a pure function of the uid.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generatedName } from "../src/lib/names.ts";

// Firebase uids are 28 characters of [A-Za-z0-9].
function uid(n) {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let x = n * 2654435761 + 1;
  let out = "";
  for (let i = 0; i < 28; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out += abc[x % abc.length];
  }
  return out;
}

describe("generatedName", () => {
  it("is two capitalised words", () => {
    assert.match(generatedName("iLJSkJ4CBoPyyDcu4PKsPwneQOH2"), /^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("is stable for a uid", () => {
    const id = uid(1);
    assert.equal(generatedName(id), generatedName(id));
  });

  it("pins the mapping, so a refactor cannot silently rename everyone", () => {
    assert.equal(generatedName("iLJSkJ4CBoPyyDcu4PKsPwneQOH2"), "Friendly Eagle");
    assert.equal(generatedName("abc"), "Curious Ocelot");
  });

  it("spreads visitors across the whole list", () => {
    const names = new Set();
    for (let i = 0; i < 2000; i++) names.add(generatedName(uid(i)));
    // 2,000 visitors over 4,096 names: a fair spread leaves ~1,600 distinct.
    assert.ok(names.size > 1400, `only ${names.size} distinct names`);
  });
});
