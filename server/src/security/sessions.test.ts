import assert from "node:assert/strict";
import { createECDH } from "node:crypto";
import test from "node:test";
import {
  getActiveSessionCount,
  getSession,
  initSession,
  resetSessionsForTests,
  sessionLimits,
} from "../services/cryptoService.js";

function clientKey(): JsonWebKey {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const pub = ecdh.getPublicKey();
  return {
    kty: "EC",
    crv: "P-256",
    x: pub.subarray(1, 33).toString("base64url"),
    y: pub.subarray(33, 65).toString("base64url"),
  };
}

test("sessions are capped per user and bound to that user", async () => {
  resetSessionsForTests();
  const previous = { ...sessionLimits };
  sessionLimits.perUser = 2;
  sessionLimits.global = 10;
  try {
    const first = await initSession(clientKey(), "user-a");
    await initSession(clientKey(), "user-a");
    const third = await initSession(clientKey(), "user-a");
    assert.equal(getSession(first.sessionId, "user-a"), undefined);
    assert.ok(getSession(third.sessionId, "user-a"));
    assert.equal(getSession(third.sessionId, "user-b"), undefined);
    assert.equal(getActiveSessionCount(), 2);
  } finally {
    sessionLimits.global = previous.global;
    sessionLimits.perUser = previous.perUser;
    resetSessionsForTests();
  }
});

test("the global session cap refuses a new session", async () => {
  resetSessionsForTests();
  const previous = { ...sessionLimits };
  sessionLimits.perUser = 5;
  sessionLimits.global = 1;
  try {
    await initSession(clientKey(), "user-a");
    await assert.rejects(() => initSession(clientKey(), "user-b"));
  } finally {
    sessionLimits.global = previous.global;
    sessionLimits.perUser = previous.perUser;
    resetSessionsForTests();
  }
});
