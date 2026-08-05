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

test("redacts the complete payment, identity, token, password, secret, and 2FA key vocabulary", () => {
  const redacted = redactAuditValue({
    IBAN: "DE02120300000000202051",
    BIC: "BYLADEM1001",
    accountOwner: "Example GmbH",
    paymentInformation: { method: "sepa" },
    passwordHash: "hash",
    apiSecret: "secret",
    refreshToken: "token",
    identityDocument: { contents: "document" },
    idCard: { url: "private" },
    twoFactor: { enabled: true },
    twoFactorSeed: "seed",
    recoveryData: ["code"],
    credentialBundle: { value: "credential" },
    safe: {
      companyName: "Example GmbH",
      reason: "Verified support request",
    },
  });

  assert.deepEqual(redacted, {
    IBAN: "[REDACTED]",
    BIC: "[REDACTED]",
    accountOwner: "[REDACTED]",
    paymentInformation: "[REDACTED]",
    passwordHash: "[REDACTED]",
    apiSecret: "[REDACTED]",
    refreshToken: "[REDACTED]",
    identityDocument: "[REDACTED]",
    idCard: "[REDACTED]",
    twoFactor: "[REDACTED]",
    twoFactorSeed: "[REDACTED]",
    recoveryData: "[REDACTED]",
    credentialBundle: "[REDACTED]",
    safe: {
      companyName: "Example GmbH",
      reason: "Verified support request",
    },
  });
});
