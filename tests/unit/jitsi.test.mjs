import test from "node:test";
import assert from "node:assert";
import crypto from "crypto";

function generateMeetingId(prefix = "hc") {
  const randomBytes = crypto.randomBytes(12).toString("hex");
  const timestamp = Date.now().toString(36);
  return `${prefix}-${randomBytes}-${timestamp}`;
}

test("Jitsi Meeting Security - Meeting IDs are unpredictable and high-entropy", () => {
  const id1 = generateMeetingId("hc");
  const id2 = generateMeetingId("hc");

  assert.notStrictEqual(id1, id2, "Generated meeting IDs must be distinct");
  assert.match(id1, /^hc-[a-f0-9]{24}-[a-z0-9]+$/, "Meeting ID must match secure randomized pattern");
  assert.ok(id1.length >= 30, "Meeting ID must have sufficient length to prevent brute-forcing");
});
