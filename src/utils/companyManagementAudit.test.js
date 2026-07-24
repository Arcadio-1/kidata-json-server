const assert = require("node:assert/strict");
const test = require("node:test");

const { redactAuditValue } = require("./companyManagementAudit");

test("redacts sensitive Company Management audit values recursively", () => {
  const redacted = redactAuditValue({
    companyName: "Example GmbH",
    credentials: {
      password: "password",
      recoveryCodes: ["code-1"],
      twoFactorSeed: "seed",
    },
    nested: [
      {
        accessToken: "token",
        identityDocumentContents: "document",
        note: "safe",
      },
    ],
  });

  assert.deepEqual(redacted, {
    companyName: "Example GmbH",
    credentials: "[REDACTED]",
    nested: [
      {
        accessToken: "[REDACTED]",
        identityDocumentContents: "[REDACTED]",
        note: "safe",
      },
    ],
  });
});
