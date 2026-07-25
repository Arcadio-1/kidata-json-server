const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jsonServer = require("json-server");

const registerCompanyManagementRoutes = require("./companyManagement");

const clone = (value) => JSON.parse(JSON.stringify(value));

const createCompany = (overrides = {}) => ({
  id: "company-test",
  onlineId: "CMP-TEST",
  operationalStatus: "active",
  registrationStatus: "approved",
  permissionProfile: "full",
  version: 3,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  profile: {
    addressData: {
      companyName: "Test Company GmbH",
      email: "company@example.test",
    },
    legalPerson: {
      firstName: "Test",
      lastName: "Owner",
    },
    paymentInformation: {
      accountOwner: "Test Company GmbH",
      IBAN: "DE1234567890",
      BIC: "TESTDEFF",
    },
  },
  medias: {
    businessLicense: [],
    idCard: [],
    logo: [],
  },
  subscription: {
    currentTariffId: "basic",
    status: "active",
    effectiveAt: "2026-01-01T00:00:00.000Z",
    renewsAt: null,
    activeAddOnCount: 0,
    addOnMonthlyTotal: 0,
    currency: "EUR",
  },
  summary: {
    generatedAt: "2026-01-02T00:00:00.000Z",
    userCount: 1,
    activeUserCount: 1,
    roleCount: 1,
    customRoleCount: 0,
    displayCount: 1,
    mediaCount: 1,
    playlistCount: 1,
    scheduleCount: 1,
    partnerCount: 0,
    pendingApprovalCount: 0,
    storageUsage: {
      images: 1,
      videos: 0,
      spots: 0,
      commercials: 0,
    },
    balance: null,
  },
  ...overrides,
});

const createState = (company) => ({
  superCompanyManagementCompanies: [company],
  superCompanyManagementUsers: [
    {
      id: "user-test",
      companyId: company.id,
      status: "active",
      version: 2,
    },
  ],
  superCompanyManagementRoles: [
    {
      id: "role-test",
      companyId: company.id,
      actionKeys: ["VIEW_MEDIA"],
      version: 4,
    },
  ],
  superCompanyManagementPackages: [
    {
      companyId: company.id,
      version: 5,
      tariff: { tariffId: "basic", status: "active" },
      addOns: [],
    },
  ],
  superCompanyManagementApprovals: [
    {
      id: "approval-test",
      companyId: company.id,
      status: "PENDING",
      version: 1,
    },
  ],
  superCompanyManagementAuditEvents: [],
  superCompanyManagementIdempotency: [],
  superCompanyManagementPermissionCatalog: [],
  superCompanyManagementPackageHistory: [],
  tariff: { tariffsList: [] },
  addOns: { addOns: [] },
  addOnBundles: [],
});

const withServer = async (state, callback) => {
  const app = express();
  const router = jsonServer.router(clone(state));
  registerCompanyManagementRoutes(app, router);
  const listener = await new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
  const address = listener.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await callback({ baseUrl, router });
  } finally {
    await new Promise((resolve, reject) => {
      listener.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

const requestJson = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  return {
    status: response.status,
    body: await response.json(),
  };
};

const statusBody = (overrides = {}) => ({
  targetStatus: "suspended",
  version: 3,
  reason: "Support review",
  idempotencyKey: "status-request-1",
  ...overrides,
});

test("company detail returns only the state-valid action and server-authored impact", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl }) => {
    const active = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test"
    );

    assert.equal(active.status, 200);
    assert.equal(active.body.allowedActions.includes("SUSPEND_COMPANY"), true);
    assert.equal(
      active.body.allowedActions.includes("REACTIVATE_COMPANY"),
      false
    );
    assert.equal(active.body.statusImpact.mockOnly, true);
    assert.equal(active.body.statusImpact.targetStatus, "suspended");
    assert.equal(
      active.body.statusImpact.effects.find(
        (effect) => effect.code === "AUTHENTICATION_SESSIONS"
      ).affected,
      false
    );
  });

  await withServer(
    createState(
      createCompany({ operationalStatus: "suspended", version: 7 })
    ),
    async ({ baseUrl }) => {
      const suspended = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test"
      );

      assert.equal(suspended.status, 200);
      assert.equal(
        suspended.body.allowedActions.includes("SUSPEND_COMPANY"),
        false
      );
      assert.equal(
        suspended.body.allowedActions.includes("REACTIVATE_COMPANY"),
        true
      );
      assert.equal(suspended.body.statusImpact.targetStatus, "active");
      assert.match(
        suspended.body.statusImpact.effects.find(
          (effect) => effect.code === "COMPANY_USERS"
        ).description,
        /not reactivated/
      );
    }
  );
});

test("restricted detail exposes no transition action or impact", async () => {
  await withServer(
    createState(createCompany({ permissionProfile: "restricted" })),
    async ({ baseUrl }) => {
      const result = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test"
      );

      assert.equal(result.status, 200);
      assert.equal(result.body.allowedActions.includes("SUSPEND_COMPANY"), false);
      assert.equal(
        result.body.allowedActions.includes("REACTIVATE_COMPANY"),
        false
      );
      assert.equal(result.body.statusImpact, null);
    }
  );
});

test("suspension changes only company status metadata and adds one audit event", async () => {
  const initialState = createState(createCompany());
  const relatedBefore = {
    users: clone(initialState.superCompanyManagementUsers),
    roles: clone(initialState.superCompanyManagementRoles),
    packages: clone(initialState.superCompanyManagementPackages),
    approvals: clone(initialState.superCompanyManagementApprovals),
  };

  await withServer(initialState, async ({ baseUrl, router }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      {
        method: "PATCH",
        body: JSON.stringify(statusBody()),
      }
    );
    const state = router.db.getState();
    const company = state.superCompanyManagementCompanies[0];

    assert.equal(result.status, 200);
    assert.equal(result.body.mockOnly, true);
    assert.equal(result.body.data.statusImpact.targetStatus, "suspended");
    assert.equal(company.operationalStatus, "suspended");
    assert.equal(company.registrationStatus, "approved");
    assert.equal(company.version, 4);
    assert.notEqual(company.updatedAt, initialState.superCompanyManagementCompanies[0].updatedAt);
    assert.deepEqual(state.superCompanyManagementUsers, relatedBefore.users);
    assert.deepEqual(state.superCompanyManagementRoles, relatedBefore.roles);
    assert.deepEqual(state.superCompanyManagementPackages, relatedBefore.packages);
    assert.deepEqual(state.superCompanyManagementApprovals, relatedBefore.approvals);
    assert.equal(state.superCompanyManagementAuditEvents.length, 1);
    assert.deepEqual(state.superCompanyManagementAuditEvents[0].before, {
      operationalStatus: "active",
    });
    assert.deepEqual(state.superCompanyManagementAuditEvents[0].after, {
      operationalStatus: "suspended",
    });
    assert.equal(state.superCompanyManagementIdempotency.length, 1);
  });
});

test("reactivation changes only company status metadata and adds one audit event", async () => {
  const company = createCompany({
    operationalStatus: "suspended",
    registrationStatus: "pending",
    version: 7,
  });
  const initialState = createState(company);
  const relatedBefore = clone(initialState);

  await withServer(initialState, async ({ baseUrl, router }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      {
        method: "PATCH",
        body: JSON.stringify(
          statusBody({
            targetStatus: "active",
            version: 7,
            idempotencyKey: "reactivate-request-1",
          })
        ),
      }
    );
    const state = router.db.getState();
    const updatedCompany = state.superCompanyManagementCompanies[0];

    assert.equal(result.status, 200);
    assert.equal(updatedCompany.operationalStatus, "active");
    assert.equal(updatedCompany.registrationStatus, "pending");
    assert.equal(updatedCompany.version, 8);
    assert.deepEqual(
      state.superCompanyManagementUsers,
      relatedBefore.superCompanyManagementUsers
    );
    assert.deepEqual(
      state.superCompanyManagementRoles,
      relatedBefore.superCompanyManagementRoles
    );
    assert.deepEqual(
      state.superCompanyManagementPackages,
      relatedBefore.superCompanyManagementPackages
    );
    assert.deepEqual(
      state.superCompanyManagementApprovals,
      relatedBefore.superCompanyManagementApprovals
    );
    assert.equal(state.superCompanyManagementAuditEvents.length, 1);
  });
});

test("identical retries return the completed response without another write", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const originalWrite = router.db.write.bind(router.db);
    let writeCount = 0;
    router.db.write = () => {
      writeCount += 1;
      return originalWrite();
    };
    const request = {
      method: "PATCH",
      body: JSON.stringify(statusBody()),
    };
    const first = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      request
    );
    const retry = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      request
    );
    const state = router.db.getState();

    assert.equal(first.status, 200);
    assert.equal(retry.status, 200);
    assert.deepEqual(retry.body, first.body);
    assert.equal(state.superCompanyManagementCompanies[0].version, 4);
    assert.equal(state.superCompanyManagementAuditEvents.length, 1);
    assert.equal(state.superCompanyManagementIdempotency.length, 1);
    assert.equal(writeCount, 1);
  });
});

test("mismatched idempotency retries return a stable conflict", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const path = "/super/company-management/companies/company-test/status";
    await requestJson(baseUrl, path, {
      method: "PATCH",
      body: JSON.stringify(statusBody()),
    });
    const conflict = await requestJson(baseUrl, path, {
      method: "PATCH",
      body: JSON.stringify(statusBody({ reason: "Different reason" })),
    });
    const state = router.db.getState();

    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "IDEMPOTENCY_CONFLICT");
    assert.equal(state.superCompanyManagementCompanies[0].version, 4);
    assert.equal(state.superCompanyManagementAuditEvents.length, 1);
    assert.equal(state.superCompanyManagementIdempotency.length, 1);
  });
});

test("stale versions and invalid transitions persist no changes", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const stale = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      {
        method: "PATCH",
        body: JSON.stringify(statusBody({ version: 2 })),
      }
    );
    const invalid = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      {
        method: "PATCH",
        body: JSON.stringify(
          statusBody({
            targetStatus: "active",
            idempotencyKey: "invalid-transition-1",
          })
        ),
      }
    );

    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "VERSION_CONFLICT");
    assert.equal(invalid.status, 409);
    assert.equal(invalid.body.code, "INVALID_STATUS_TRANSITION");
    assert.deepEqual(router.db.getState(), before);
  });
});

test("unauthorized transitions return 403 and persist no changes", async () => {
  const state = createState(createCompany({ permissionProfile: "restricted" }));
  await withServer(state, async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      {
        method: "PATCH",
        body: JSON.stringify(statusBody()),
      }
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.code, "ACTION_NOT_ALLOWED");
    assert.deepEqual(router.db.getState(), before);
  });
});

test("a persistence failure restores the complete in-memory state", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const write = router.db.write;
    router.db.write = () => {
      throw new Error("Simulated persistence failure");
    };
    try {
      const result = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/status",
        {
          method: "PATCH",
          body: JSON.stringify(statusBody()),
        }
      );

      assert.equal(result.status, 500);
      assert.equal(result.body.code, "COMPANY_STATUS_UPDATE_FAILED");
      assert.equal(typeof result.body.correlationId, "string");
      assert.deepEqual(router.db.getState(), before);
    } finally {
      router.db.write = write;
    }
  });
});
