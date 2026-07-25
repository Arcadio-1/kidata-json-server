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
      tariff: {
        tariffId: "basic",
        status: "active",
        effectiveAt: "2026-01-01T00:00:00.000Z",
        renewsAt: null,
      },
      addOns: [],
      appliedPromotions: [],
      pricing: {
        currency: "EUR",
        tariffMonthly: 5,
        addOnsMonthly: 0,
        discountMonthly: 0,
        totalMonthly: 5,
        vatRate: 19,
        billedWithPlan: "Basic",
      },
      externalSync: {
        billing: "notRequired",
        lastAttemptAt: null,
        message: null,
      },
      addOnEntitlements: {},
      resourceUsage: { displays: 1, users: 1, storageUsedGb: 1 },
      downgradeChecks: [],
      offers: [],
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
  tariff: {
    tariffsList: [
      {
        id: "free",
        name: "Free",
        price: "0",
        details: {
          activeDisplays: "1",
          teamSize: "1",
          cloudStorageIncluded: "1 GB",
        },
      },
      {
        id: "basic",
        name: "Basic",
        price: "5",
        details: {
          activeDisplays: "5",
          teamSize: "5",
          cloudStorageIncluded: "5 GB",
        },
      },
      {
        id: "plus",
        name: "Plus",
        price: "20",
        details: {
          activeDisplays: "any number",
          teamSize: "20",
          cloudStorageIncluded: "100 GB",
        },
      },
    ],
  },
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

const tariffBody = (overrides = {}) => ({
  targetTariffId: "plus",
  effectiveAt: "2026-08-01T00:00:00.000Z",
  reason: "Contracted plan adjustment",
  salesReference: "SALE-100",
  version: 5,
  idempotencyKey: "tariff-request-1",
  ...overrides,
});

const addOnCatalog = () => [
  { id: "addon-1", name: "Storage", price: "10", hasQuantity: false, minQuantity: 1, maxQuantity: 1 },
  { id: "addon-2", name: "Backup", price: "7", hasQuantity: false, minQuantity: 1, maxQuantity: 1 },
  { id: "addon-3", name: "Archive", price: "4", hasQuantity: false, minQuantity: 1, maxQuantity: 1 },
  { id: "addon-4", name: "Seats", price: "4", hasQuantity: true, minQuantity: 1, maxQuantity: 3 },
  { id: "addon-5", name: "Roles", price: "3", hasQuantity: false, minQuantity: 1, maxQuantity: 1 },
];

const addOnBody = (overrides = {}) => ({
  addOnId: "addon-1",
  quantity: 1,
  effectiveAt: "2026-08-01T00:00:00.000Z",
  reason: "Contracted add-on change",
  salesReference: "SALE-200",
  version: 5,
  idempotencyKey: "add-on-request-1",
  ...overrides,
});

const offerBody = (overrides = {}) => ({
  reason: "Approved promotional offer",
  salesReference: "SALE-300",
  version: 5,
  idempotencyKey: "offer-request-1",
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

test("tariff upgrades atomically recalculate totals and create one history and audit event", async () => {
  const initialState = createState(createCompany());
  const catalogsBefore = clone({
    tariff: initialState.tariff,
    addOns: initialState.addOns,
    addOnBundles: initialState.addOnBundles,
  });
  const companyBefore = clone(initialState.superCompanyManagementCompanies[0]);

  await withServer(initialState, async ({ baseUrl, router }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/subscription",
      { method: "PATCH", body: JSON.stringify(tariffBody()) },
    );
    const state = router.db.getState();
    const subscription = state.superCompanyManagementPackages[0];

    assert.equal(result.status, 200);
    assert.equal(result.body.mockOnly, true);
    assert.equal(subscription.tariff.tariffId, "plus");
    assert.equal(subscription.version, 6);
    assert.equal(result.body.data.subscription.pricing.tariffMonthly, 20);
    assert.equal(result.body.data.subscription.pricing.totalMonthly, 20);
    assert.equal(state.superCompanyManagementPackageHistory.length, 1);
    assert.equal(
      state.superCompanyManagementPackageHistory[0].type,
      "TARIFF_CHANGED",
    );
    assert.equal(state.superCompanyManagementAuditEvents.length, 1);
    assert.equal(
      state.superCompanyManagementAuditEvents[0].entityType,
      "subscription",
    );
    assert.equal(state.superCompanyManagementIdempotency.length, 1);
    assert.deepEqual(state.superCompanyManagementCompanies[0], companyBefore);
    assert.deepEqual(
      {
        tariff: state.tariff,
        addOns: state.addOns,
        addOnBundles: state.addOnBundles,
      },
      catalogsBefore,
    );
  });
});

test("a server-valid tariff downgrade is permitted", async () => {
  await withServer(
    createState(createCompany()),
    async ({ baseUrl, router }) => {
      const result = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/subscription",
        {
          method: "PATCH",
          body: JSON.stringify(
            tariffBody({
              targetTariffId: "free",
              idempotencyKey: "downgrade-1",
            }),
          ),
        },
      );

      assert.equal(result.status, 200);
      assert.equal(
        router.db.getState().superCompanyManagementPackages[0].tariff.tariffId,
        "free",
      );
    },
  );
});

test("an unsafe tariff downgrade returns structured violations without partial state", async () => {
  const initialState = createState(createCompany());
  initialState.superCompanyManagementPackages[0].resourceUsage.displays = 2;

  await withServer(initialState, async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/subscription",
      {
        method: "PATCH",
        body: JSON.stringify(
          tariffBody({
            targetTariffId: "free",
            idempotencyKey: "downgrade-unsafe-1",
          }),
        ),
      },
    );

    assert.equal(result.status, 422);
    assert.equal(result.body.code, "TARIFF_LIMIT_VIOLATION");
    assert.equal(result.body.violations[0].code, "DISPLAY_LIMIT_EXCEEDED");
    assert.deepEqual(router.db.getState(), before);
  });
});

test("tariff changes reject stale versions and unauthorized operators without writes", async () => {
  await withServer(
    createState(createCompany()),
    async ({ baseUrl, router }) => {
      const before = clone(router.db.getState());
      const result = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/subscription",
        {
          method: "PATCH",
          body: JSON.stringify(
            tariffBody({ version: 4, idempotencyKey: "stale-1" }),
          ),
        },
      );
      assert.equal(result.status, 409);
      assert.equal(result.body.code, "VERSION_CONFLICT");
      assert.deepEqual(router.db.getState(), before);
    },
  );

  await withServer(
    createState(createCompany({ permissionProfile: "restricted" })),
    async ({ baseUrl, router }) => {
      const before = clone(router.db.getState());
      const result = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/subscription",
        { method: "PATCH", body: JSON.stringify(tariffBody()) },
      );
      assert.equal(result.status, 403);
      assert.equal(result.body.code, "ACTION_NOT_ALLOWED");
      assert.deepEqual(router.db.getState(), before);
    },
  );
});

test("identical tariff retries replay once and fingerprint conflicts do not write", async () => {
  await withServer(
    createState(createCompany()),
    async ({ baseUrl, router }) => {
      const originalWrite = router.db.write.bind(router.db);
      let writeCount = 0;
      router.db.write = () => {
        writeCount += 1;
        return originalWrite();
      };
      const request = { method: "PATCH", body: JSON.stringify(tariffBody()) };
      const first = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/subscription",
        request,
      );
      const replay = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/subscription",
        request,
      );
      const conflict = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/subscription",
        {
          method: "PATCH",
          body: JSON.stringify(tariffBody({ reason: "Different reason" })),
        },
      );
      const state = router.db.getState();

      assert.equal(first.status, 200);
      assert.equal(replay.status, 200);
      assert.deepEqual(replay.body, first.body);
      assert.equal(conflict.status, 409);
      assert.equal(conflict.body.code, "IDEMPOTENCY_CONFLICT");
      assert.equal(writeCount, 1);
      assert.equal(state.superCompanyManagementPackages[0].version, 6);
      assert.equal(state.superCompanyManagementPackageHistory.length, 1);
      assert.equal(state.superCompanyManagementAuditEvents.length, 1);
    },
  );
});

test("add-on assignment recalculates the package and preserves the global catalog", async () => {
  const initialState = createState(createCompany());
  initialState.addOns.addOns = addOnCatalog();
  const catalogBefore = clone(initialState.addOns);

  await withServer(initialState, async ({ baseUrl, router }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/add-ons",
      { method: "POST", body: JSON.stringify(addOnBody()) },
    );
    const state = router.db.getState();
    const subscription = result.body.data.subscription;

    assert.equal(result.status, 200);
    assert.equal(subscription.addOns[0].addOnId, "addon-1");
    assert.equal(subscription.pricing.addOnsMonthly, 10);
    assert.equal(subscription.pricing.totalMonthly, 15);
    assert.equal(subscription.entitlements.cloudStorageIncluded, "105 GB");
    assert.equal(state.superCompanyManagementPackages[0].version, 6);
    assert.equal(state.superCompanyManagementPackageHistory.length, 1);
    assert.equal(state.superCompanyManagementAuditEvents.length, 1);
    assert.deepEqual(state.addOns, catalogBefore);
  });
});

test("add-on quantity changes enforce non-quantity and bounded-quantity rules", async () => {
  const initialState = createState(createCompany());
  initialState.addOns.addOns = addOnCatalog();
  initialState.superCompanyManagementPackages[0].addOns = [
    { addOnId: "addon-1", status: "active", quantity: 1, unitPrice: 10, effectiveAt: "2026-01-01T00:00:00.000Z", endsAt: null, source: "superAdmin", offerId: null },
    { addOnId: "addon-4", status: "active", quantity: 1, unitPrice: 4, effectiveAt: "2026-01-01T00:00:00.000Z", endsAt: null, source: "superAdmin", offerId: null },
  ];

  await withServer(initialState, async ({ baseUrl, router }) => {
    const nonQuantity = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/add-ons/addon-1",
      { method: "PATCH", body: JSON.stringify(addOnBody({ quantity: 2 })) },
    );
    const changed = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/add-ons/addon-4",
      { method: "PATCH", body: JSON.stringify(addOnBody({ addOnId: "addon-4", quantity: 2, idempotencyKey: "seat-change-1" })) },
    );
    const outOfRange = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/add-ons/addon-4",
      { method: "PATCH", body: JSON.stringify(addOnBody({ addOnId: "addon-4", quantity: 4, idempotencyKey: "seat-change-2" })) },
    );
    const state = router.db.getState();

    assert.equal(nonQuantity.status, 400);
    assert.equal(changed.status, 200);
    assert.equal(changed.body.data.subscription.addOns.find((item) => item.addOnId === "addon-4").quantity, 2);
    assert.equal(outOfRange.status, 400);
    assert.equal(state.superCompanyManagementPackages[0].version, 6);
    assert.equal(state.superCompanyManagementPackageHistory.length, 1);
    assert.equal(state.superCompanyManagementAuditEvents.length, 1);
  });
});

test("unsafe add-on removal returns structured violations without writes", async () => {
  const initialState = createState(createCompany());
  initialState.addOns.addOns = addOnCatalog();
  initialState.superCompanyManagementPackages[0].addOns = [
    { addOnId: "addon-1", status: "active", quantity: 1, unitPrice: 10, effectiveAt: "2026-01-01T00:00:00.000Z", endsAt: null, source: "superAdmin", offerId: null },
    { addOnId: "addon-2", status: "active", quantity: 1, unitPrice: 7, effectiveAt: "2026-01-01T00:00:00.000Z", endsAt: null, source: "superAdmin", offerId: null },
  ];
  const expectedState = clone(initialState);

  await withServer(initialState, async ({ baseUrl, router }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/add-ons/addon-1",
      {
        method: "DELETE",
        body: JSON.stringify({
          reason: "Remove unused add-on",
          version: 5,
          idempotencyKey: "remove-1",
        }),
      },
    );

    assert.equal(result.status, 422);
    assert.equal(result.body.code, "ADD_ON_REMOVAL_UNSAFE");
    assert.equal(result.body.violations[0].code, "ADD_ON_DEPENDENCY_IN_USE");
    assert.deepEqual(router.db.getState(), expectedState);
  });
});

test("duplicate add-on capabilities are rejected without writes", async () => {
  const initialState = createState(createCompany());
  initialState.addOns.addOns = addOnCatalog();
  initialState.superCompanyManagementPackages[0].addOns = [
    { addOnId: "addon-1", status: "active", quantity: 1, unitPrice: 10, effectiveAt: "2026-01-01T00:00:00.000Z", endsAt: null, source: "superAdmin", offerId: null },
  ];
  const expectedState = clone(initialState);

  await withServer(initialState, async ({ baseUrl, router }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/add-ons",
      { method: "POST", body: JSON.stringify(addOnBody({ addOnId: "addon-3" })) },
    );

    assert.equal(result.status, 422);
    assert.equal(result.body.violations[0].code, "DUPLICATE_ADD_ON_CAPABILITY");
    assert.deepEqual(router.db.getState(), expectedState);
  });
});

test("eligible offers apply atomically while expired and incompatible offers do not write", async () => {
  const initialState = createState(createCompany());
  initialState.addOns.addOns = addOnCatalog();
  initialState.superCompanyManagementPackages[0].offers = [
    { id: "offer-storage", label: "Storage incentive", status: "active", eligible: true, validFrom: "2025-01-01T00:00:00.000Z", validUntil: "2099-01-01T00:00:00.000Z", includedAddOnIds: ["addon-1"], discountType: "fixed", discountValue: 2 },
    { id: "offer-expired", label: "Expired", status: "active", eligible: true, validFrom: "2025-01-01T00:00:00.000Z", validUntil: "2025-02-01T00:00:00.000Z", includedAddOnIds: ["addon-1"], discountType: "fixed", discountValue: 2 },
    { id: "offer-incompatible", label: "Roles", status: "active", eligible: true, validFrom: "2025-01-01T00:00:00.000Z", validUntil: "2099-01-01T00:00:00.000Z", includedAddOnIds: ["addon-5"], discountType: "fixed", discountValue: 0 },
  ];

  await withServer(initialState, async ({ baseUrl, router }) => {
    const availableOffers = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/offers",
    );
    const applied = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/offers/offer-storage/apply",
      { method: "POST", body: JSON.stringify(offerBody()) },
    );
    const stateAfterApply = clone(router.db.getState());
    const expired = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/offers/offer-expired/apply",
      { method: "POST", body: JSON.stringify(offerBody({ version: 6, idempotencyKey: "expired-offer-1" })) },
    );
    const incompatible = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/offers/offer-incompatible/apply",
      { method: "POST", body: JSON.stringify(offerBody({ version: 6, idempotencyKey: "incompatible-offer-1" })) },
    );

    assert.equal(availableOffers.status, 200);
    assert.equal(availableOffers.body.find((offer) => offer.id === "offer-storage").eligible, true);
    assert.equal(availableOffers.body.find((offer) => offer.id === "offer-expired").eligible, false);
    assert.equal(availableOffers.body.find((offer) => offer.id === "offer-incompatible").eligible, false);
    assert.equal(applied.status, 200);
    assert.equal(applied.body.data.subscription.appliedPromotions[0].offerId, "offer-storage");
    assert.equal(applied.body.data.subscription.pricing.totalMonthly, 13);
    assert.equal(router.db.getState().superCompanyManagementPackageHistory.length, 1);
    assert.equal(router.db.getState().superCompanyManagementAuditEvents.length, 1);
    assert.equal(expired.status, 422);
    assert.equal(expired.body.code, "OFFER_NOT_ELIGIBLE");
    assert.equal(incompatible.status, 422);
    assert.equal(incompatible.body.code, "OFFER_NOT_COMPATIBLE");
    assert.deepEqual(router.db.getState(), stateAfterApply);
  });
});

test("add-on mutations replay once, reject fingerprint conflicts, and stay company-scoped", async () => {
  const initialState = createState(createCompany());
  initialState.addOns.addOns = addOnCatalog();
  const otherCompany = createCompany({ id: "company-other", onlineId: "CMP-OTHER" });
  initialState.superCompanyManagementCompanies.push(otherCompany);
  initialState.superCompanyManagementPackages.push({ ...clone(initialState.superCompanyManagementPackages[0]), companyId: otherCompany.id });

  await withServer(initialState, async ({ baseUrl, router }) => {
    const originalWrite = router.db.write.bind(router.db);
    let writeCount = 0;
    router.db.write = () => { writeCount += 1; return originalWrite(); };
    const request = { method: "POST", body: JSON.stringify(addOnBody()) };
    const first = await requestJson(baseUrl, "/super/company-management/companies/company-test/add-ons", request);
    const replay = await requestJson(baseUrl, "/super/company-management/companies/company-test/add-ons", request);
    const conflict = await requestJson(baseUrl, "/super/company-management/companies/company-test/add-ons", { method: "POST", body: JSON.stringify(addOnBody({ reason: "Different reason" })) });
    const other = router.db.getState().superCompanyManagementPackages.find((item) => item.companyId === otherCompany.id);

    assert.equal(first.status, 200);
    assert.equal(replay.status, 200);
    assert.deepEqual(replay.body, first.body);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "IDEMPOTENCY_CONFLICT");
    assert.equal(writeCount, 1);
    assert.equal(other.version, 5);
    assert.deepEqual(other.addOns, []);
  });
});

test("add-on actions are independently authorized and persistence failures are atomic", async () => {
  const restrictedState = createState(createCompany({ permissionProfile: "restricted" }));
  restrictedState.addOns.addOns = addOnCatalog();
  await withServer(restrictedState, async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const result = await requestJson(baseUrl, "/super/company-management/companies/company-test/add-ons", { method: "POST", body: JSON.stringify(addOnBody()) });
    assert.equal(result.status, 403);
    assert.deepEqual(router.db.getState(), before);
  });

  const failingState = createState(createCompany());
  failingState.addOns.addOns = addOnCatalog();
  await withServer(failingState, async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    router.db.write = () => { throw new Error("write failure"); };
    const result = await requestJson(baseUrl, "/super/company-management/companies/company-test/add-ons", { method: "POST", body: JSON.stringify(addOnBody()) });
    assert.equal(result.status, 500);
    assert.equal(result.body.code, "PACKAGE_UPDATE_FAILED");
    assert.deepEqual(router.db.getState(), before);
  });
});
