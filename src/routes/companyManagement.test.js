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
    roleCount: 5,
    customRoleCount: 4,
    displayCount: 1,
    mediaCount: 1,
    playlistCount: 1,
    scheduleCount: 1,
    partnerCount: 0,
    pendingApprovalCount: 2,
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
      onlineId: "USR-TEST",
      username: "test.user",
      firstName: "Test",
      lastName: "User",
      email: "user@example.test",
      departmentId: "support",
      departmentTitle: "Support",
      categoryId: "operations",
      categoryTitle: "Operations",
      categoryColor: "#2563eb",
      roleId: "role-test",
      role: { id: "role-test", enName: "Viewer", deName: "Betrachter" },
      status: "active",
      isSystemInactive: false,
      twoFactor: { enabled: true, lastResetAt: null },
      updatedAt: "2026-01-02T00:00:00.000Z",
      version: 2,
      allowedActions: [
        "EDIT_COMPANY_USER",
        "ASSIGN_COMPANY_USER_ROLE",
        "SET_COMPANY_USER_STATUS",
        "RESET_COMPANY_USER_TWO_FACTOR",
      ],
    },
  ],
  superCompanyManagementRoles: [
    {
      id: "role-test",
      companyId: company.id,
      key: "custom-viewer",
      enName: "Viewer",
      deName: "Betrachter",
      enDescription: "Can view company media",
      deDescription: "Kann Unternehmensmedien ansehen",
      isSystem: false,
      isCustom: true,
      isMutable: true,
      isAssignable: true,
      assignedUserCount: 1,
      actionKeys: ["VIEW_MEDIA"],
      version: 4,
    },
    {
      id: "role-next",
      companyId: company.id,
      key: "custom-editor",
      enName: "Editor",
      deName: "Redakteur",
      enDescription: "Can edit content",
      deDescription: "Kann Inhalte bearbeiten",
      isSystem: false,
      isCustom: true,
      isMutable: true,
      isAssignable: true,
      assignedUserCount: 0,
      actionKeys: ["VIEW_MEDIA"],
      version: 1,
    },
    {
      id: "role-locked",
      companyId: company.id,
      key: "custom-locked",
      enName: "Locked",
      deName: "Gesperrt",
      enDescription: "Not assignable",
      deDescription: "Nicht zuweisbar",
      isSystem: false,
      isCustom: true,
      isMutable: true,
      isAssignable: false,
      assignedUserCount: 0,
      actionKeys: ["VIEW_MEDIA"],
      version: 1,
    },
    {
      id: "role-entitled",
      companyId: company.id,
      key: "custom-manager",
      enName: "Role manager",
      deName: "Rollenverwaltung",
      enDescription: "Requires extended roles",
      deDescription: "Erfordert erweiterte Rollen",
      isSystem: false,
      isCustom: true,
      isMutable: true,
      isAssignable: true,
      assignedUserCount: 0,
      actionKeys: ["MANAGE_ROLE"],
      version: 1,
    },
    {
      id: "role-other-company",
      companyId: "company-other",
      key: "other-role",
      enName: "Other company role",
      deName: "Andere Unternehmensrolle",
      enDescription: "Other company role",
      deDescription: "Andere Unternehmensrolle",
      isSystem: false,
      isCustom: true,
      isMutable: true,
      isAssignable: true,
      assignedUserCount: 0,
      actionKeys: ["VIEW_MEDIA"],
      version: 1,
    },
    {
      id: "role-system",
      companyId: company.id,
      key: "system-owner",
      enName: "Owner",
      deName: "Eigentümer",
      enDescription: "Built-in owner role",
      deDescription: "Integrierte Eigentümerrolle",
      isSystem: true,
      isCustom: false,
      isMutable: false,
      isAssignable: true,
      assignedUserCount: 0,
      actionKeys: ["VIEW_MEDIA"],
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
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
      companyName: "Test Company GmbH",
      companyOnlineId: company.onlineId,
      type: "REGISTRATION",
      status: "PENDING",
      isSeen: false,
      requester: {
        id: "requester-test",
        name: "Test Requester",
        email: "requester@example.test",
      },
      submittedAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
      shortSummary: "New company registration",
      registrationSnapshot: {
        profile: {
          addressData: { companyName: "Test Company GmbH", city: "Berlin" },
          paymentInformation: { IBAN: "DE0000000000" },
        },
        medias: {
          businessLicense: [
            {
              uid: "license-test",
              name: "business-license.pdf",
              type: "application/pdf",
              status: "done",
              url: "https://private.test/license.pdf",
            },
          ],
          idCard: [],
          logo: [],
        },
      },
      history: [],
      version: 1,
    },
    {
      id: "approval-profile",
      companyId: company.id,
      companyName: "Test Company GmbH",
      companyOnlineId: company.onlineId,
      type: "PROFILE_EDIT",
      status: "PENDING",
      isSeen: false,
      requester: {
        id: "requester-test",
        name: "Test Requester",
        email: "requester@example.test",
      },
      submittedAt: "2026-01-04T00:00:00.000Z",
      updatedAt: "2026-01-04T00:00:00.000Z",
      shortSummary: "Company name correction",
      currentInfo: { addressData: { companyName: "Test Company GmbH" } },
      requestedInfo: { addressData: { companyName: "Test Company AG" } },
      medias: {
        businessLicense: [],
        idCard: [],
        logo: [],
      },
      history: [],
      version: 2,
    },
    {
      id: "approval-other-company",
      companyId: "company-other",
      companyName: "Other Company",
      companyOnlineId: "CMP-OTHER",
      type: "PROFILE_EDIT",
      status: "PENDING",
      isSeen: false,
      requester: {
        id: "requester-other",
        name: "Other Requester",
        email: "other@example.test",
      },
      submittedAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
      shortSummary: "Other company request",
      currentInfo: {},
      requestedInfo: {},
      medias: { businessLicense: [], idCard: [], logo: [] },
      history: [],
      version: 1,
    },
  ],
  superCompanyManagementAuditEvents: [],
  superCompanyManagementIdempotency: [],
  superCompanyManagementPermissionCatalog: [
    {
      id: "content",
      enLabel: "Content",
      deLabel: "Inhalte",
      actions: [
        {
          actionKey: "VIEW_MEDIA",
          enLabel: "View media",
          deLabel: "Medien ansehen",
        },
        {
          actionKey: "MANAGE_ROLE",
          enLabel: "Manage roles",
          deLabel: "Rollen verwalten",
        },
      ],
    },
  ],
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

const userEditBody = (overrides = {}) => ({
  changes: { departmentId: "customer-success", departmentTitle: "Customer success" },
  version: 2,
  ...overrides,
});

const userRoleBody = (overrides = {}) => ({
  changes: { roleId: "role-next" },
  version: 2,
  reason: "Align support responsibilities",
  idempotencyKey: "user-role-request-1",
  ...overrides,
});

const userStatusBody = (overrides = {}) => ({
  targetStatus: "paused",
  version: 2,
  reason: "Temporary support pause",
  idempotencyKey: "user-status-request-1",
  ...overrides,
});

const userTwoFactorBody = (overrides = {}) => ({
  version: 2,
  reason: "Verified 2FA support request",
  idempotencyKey: "user-2fa-request-1",
  ...overrides,
});

const roleMetadata = (overrides = {}) => ({
  enName: "Support editor",
  deName: "Support-Redakteur",
  enDescription: "Supports content operations",
  deDescription: "Unterstützt Inhaltsvorgänge",
  ...overrides,
});

const roleCreateBody = (overrides = {}) => ({
  changes: roleMetadata(),
  version: 3,
  idempotencyKey: "role-create-1",
  ...overrides,
});

const roleMutationBody = (overrides = {}) => ({
  changes: roleMetadata(),
  version: 1,
  idempotencyKey: "role-update-1",
  ...overrides,
});

const rolePermissionsBody = (overrides = {}) => ({
  actions: [{ actionKey: "VIEW_MEDIA", access: true }],
  reason: "Approved support capability update",
  version: 1,
  idempotencyKey: "role-permissions-1",
  ...overrides,
});

const roleDeleteBody = (overrides = {}) => ({
  reason: "Unused custom role cleanup",
  version: 1,
  idempotencyKey: "role-delete-1",
  ...overrides,
});

const approvalDecisionBody = (overrides = {}) => ({
  status: "APPROVED",
  version: 1,
  idempotencyKey: "approval-decision-1",
  ...overrides,
});

test("TESTS/WIRE directory normalizes envelopes, filters, deterministic sorting, and invalid values", async () => {
  const companyA = createCompany({
    id: "company-a",
    onlineId: "CMP-A",
    updatedAt: "2026-02-01T00:00:00.000Z",
  });
  const companyB = createCompany({
    id: "company-b",
    onlineId: "CMP-B",
    operationalStatus: "suspended",
    registrationStatus: "pending",
    updatedAt: "2026-02-01T00:00:00.000Z",
  });
  companyA.profile.addressData.companyName = "Shared Company Alpha";
  companyA.profile.addressData.countryId = "de";
  companyA.profile.addressData.countryLabel = "Germany";
  companyB.profile.addressData.companyName = "Shared Company Beta";
  companyB.profile.addressData.countryId = "at";
  companyB.profile.addressData.countryLabel = "Austria";
  companyB.summary.pendingApprovalCount = 0;
  const state = createState(companyA);
  state.superCompanyManagementCompanies.push(companyB);

  await withServer(state, async ({ baseUrl }) => {
    const firstPage = await requestJson(
      baseUrl,
      "/super/company-management/companies?sortBy=updatedAt&sortOrder=desc&page=1&pageSize=1",
    );
    const beyondEnd = await requestJson(
      baseUrl,
      "/super/company-management/companies?page=3&pageSize=1",
    );
    const filtered = await requestJson(
      baseUrl,
      "/super/company-management/companies?keyword=beta&operationalStatus=suspended&registrationStatus=pending&countryId=at&pendingAction=false",
    );
    const unknown = await requestJson(
      baseUrl,
      "/super/company-management/companies?companyName=ignored",
    );
    const invalidSort = await requestJson(
      baseUrl,
      "/super/company-management/companies?sortBy=permissionProfile",
    );
    const invalidFilter = await requestJson(
      baseUrl,
      "/super/company-management/companies?operationalStatus=deleted",
    );

    assert.equal(firstPage.status, 200);
    assert.deepEqual(Object.keys(firstPage.body).sort(), [
      "items",
      "page",
      "pageSize",
      "totalCount",
      "totalPages",
    ]);
    assert.deepEqual(firstPage.body.items.map((item) => item.id), ["company-a"]);
    assert.equal(firstPage.body.totalCount, 2);
    assert.equal(firstPage.body.totalPages, 2);
    assert.deepEqual(beyondEnd.body, {
      items: [],
      totalCount: 2,
      page: 3,
      pageSize: 1,
      totalPages: 2,
    });
    assert.deepEqual(filtered.body.items.map((item) => item.id), ["company-b"]);
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.code, "UNKNOWN_QUERY_PARAMETER");
    assert.deepEqual(unknown.body.fieldErrors, {
      companyName: ["Unsupported query parameter"],
    });
    assert.equal(invalidSort.status, 400);
    assert.equal(invalidSort.body.code, "INVALID_SORT_FIELD");
    assert.equal(invalidFilter.status, 400);
    assert.equal(invalidFilter.body.code, "INVALID_FILTER_VALUE");
  });
});

test("TESTS/CORE canonical company scope isolates overlapping users, roles, approvals, and audit records", async () => {
  const company = createCompany();
  const otherCompany = createCompany({
    id: "company-other",
    onlineId: "CMP-OTHER",
  });
  const state = createState(company);
  state.superCompanyManagementCompanies.push(otherCompany);
  state.superCompanyManagementUsers.push({
    ...clone(state.superCompanyManagementUsers[0]),
    id: "user-other",
    companyId: otherCompany.id,
    onlineId: "USR-OTHER",
    email: "user.other@example.test",
  });
  state.superCompanyManagementAuditEvents.push(
    {
      id: "audit-company-test",
      timestamp: "2026-01-05T00:00:00.000Z",
      actor: { id: "admin-a", name: "Admin A" },
      companyId: company.id,
      actionType: "company.profile.updated",
      entityType: "company",
      entityId: company.id,
      before: null,
      after: { companyName: "Test Company GmbH" },
      reason: null,
      result: "success",
      correlationId: null,
    },
    {
      id: "audit-company-other",
      timestamp: "2026-01-05T00:00:00.000Z",
      actor: { id: "admin-a", name: "Admin A" },
      companyId: otherCompany.id,
      actionType: "company.profile.updated",
      entityType: "company",
      entityId: otherCompany.id,
      before: null,
      after: { companyName: "Other Company" },
      reason: null,
      result: "success",
      correlationId: null,
    },
  );

  await withServer(state, async ({ baseUrl }) => {
    const users = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users?keyword=Test%20User",
    );
    const foreignUser = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-other",
    );
    const roles = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles",
    );
    const foreignRole = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-other-company",
    );
    const approvals = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals",
    );
    const foreignApproval = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-other-company",
    );
    const audit = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/audit-events?entityType=company&sortBy=timestamp&sortOrder=desc",
    );

    assert.deepEqual(users.body.items.map((item) => item.id), ["user-test"]);
    assert.equal(users.body.items[0].companyId, "company-test");
    assert.equal(foreignUser.status, 404);
    assert.equal(foreignUser.body.code, "COMPANY_USER_NOT_FOUND");
    assert.equal(roles.body.every((item) => item.companyId === "company-test"), true);
    assert.equal(foreignRole.status, 404);
    assert.equal(approvals.body.items.every((item) => item.companyId === "company-test"), true);
    assert.equal(foreignApproval.status, 404);
    assert.deepEqual(audit.body.items.map((item) => item.id), ["audit-company-test"]);
  });
});

test("TESTS/WIRE catalogs are adapted read-only data and remain separate from company assignments and cart", async () => {
  const state = createState(createCompany());
  state.tariff.tariffsList[1].alternativeId = "legacy-basic";
  state.addOns.addOns = [
    {
      id: "addon-catalog",
      name: "Catalog storage",
      price: "9.50",
      isActive: true,
      currentQuantity: 99,
      tags: ["active", "popular"],
    },
  ];
  state.addOnBundles = [{ id: "bundle-catalog", title: "Catalog bundle" }];
  state.cart = [{ id: "cart-item", companyId: "company-test", quantity: 4 }];
  const catalogsBefore = clone({
    tariff: state.tariff,
    addOns: state.addOns,
    addOnBundles: state.addOnBundles,
    cart: state.cart,
  });

  await withServer(state, async ({ baseUrl, router }) => {
    const tariffs = await requestJson(baseUrl, "/super/company-management/tariffs");
    const addOns = await requestJson(baseUrl, "/super/company-management/add-ons");
    const bundles = await requestJson(baseUrl, "/super/company-management/bundles");
    const permissions = await requestJson(
      baseUrl,
      "/super/company-management/permission-catalog",
    );

    assert.equal(typeof tariffs.body.find((item) => item.id === "basic").price, "number");
    assert.equal(tariffs.body.find((item) => item.id === "basic").alternativeId, undefined);
    assert.equal(addOns.body[0].isActive, undefined);
    assert.equal(addOns.body[0].currentQuantity, undefined);
    assert.deepEqual(addOns.body[0].tags, ["popular"]);
    assert.deepEqual(bundles.body, [{ id: "bundle-catalog", title: "Catalog bundle" }]);
    assert.deepEqual(permissions.body, state.superCompanyManagementPermissionCatalog);
    assert.deepEqual(
      {
        tariff: router.db.getState().tariff,
        addOns: router.db.getState().addOns,
        addOnBundles: router.db.getState().addOnBundles,
        cart: router.db.getState().cart,
      },
      catalogsBefore,
    );
  });
});

test("TESTS/APPROVALS queue ordering and workflow seen state remain independent from notification inbox state", async () => {
  const state = createState(createCompany());
  state.superCompanyManagementApprovals.push({
    ...clone(state.superCompanyManagementApprovals[0]),
    id: "approval-final-oldest",
    status: "APPROVED",
    submittedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  state.superNotifications = [
    {
      id: "notification-approval-test",
      isSeen: false,
      resourceType: "COMPANY_REGISTRATION_APPROVAL",
      companyId: "company-test",
      approvalId: "approval-test",
    },
  ];

  await withServer(state, async ({ baseUrl, router }) => {
    const queue = await requestJson(
      baseUrl,
      "/super/company-management/approvals?pageSize=10",
    );
    const unseen = await requestJson(
      baseUrl,
      "/super/company-management/approvals?isSeen=false&type=REGISTRATION",
    );
    const notificationsBefore = clone(router.db.getState().superNotifications);
    const decision = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      { method: "PATCH", body: JSON.stringify(approvalDecisionBody()) },
    );
    const nextState = router.db.getState();
    const decidedApproval = nextState.superCompanyManagementApprovals.find(
      (item) => item.id === "approval-test",
    );

    assert.deepEqual(queue.body.items.slice(0, 3).map((item) => item.id), [
      "approval-test",
      "approval-profile",
      "approval-other-company",
    ]);
    assert.equal(queue.body.items.at(-1).id, "approval-final-oldest");
    assert.equal(unseen.body.items.every((item) => item.type === "REGISTRATION" && item.isSeen === false), true);
    assert.equal(decision.status, 200);
    assert.equal(decidedApproval.status, "APPROVED");
    assert.equal(decidedApproval.isSeen, false);
    assert.deepEqual(nextState.superNotifications, notificationsBefore);
    assert.equal(nextState.superCompanyManagementAuditEvents.length, 1);
    assert.equal(nextState.superCompanyManagementIdempotency.length, 1);
  });
});

test("TESTS/APPROVALS workflow seen changes only the scoped approval", async () => {
  const state = createState(createCompany());
  state.superNotifications = [{ id: "notification-approval", isSeen: false }];
  await withServer(state, async ({ baseUrl, router }) => {
    const approval = state.superCompanyManagementApprovals.find((item) => item.id === "approval-test");
    const version = approval.version;
    const notificationsBefore = clone(state.superNotifications);
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/seen",
      { method: "PATCH", body: JSON.stringify({ isSeen: true, version }) },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.data.isSeen, true);
    const nextState = router.db.getState();
    assert.equal(nextState.superCompanyManagementApprovals.find((item) => item.id === "approval-test").version, version + 1);
    assert.deepEqual(nextState.superNotifications, notificationsBefore);
    assert.equal(nextState.superCompanyManagementAuditEvents.length, 0);
  });
});

test("TESTS/CORE idempotency keys cannot cross privileged operations and success uses one atomic envelope", async () => {
  const state = createState(createCompany());
  state.addOns.addOns = addOnCatalog();

  await withServer(state, async ({ baseUrl, router }) => {
    const originalWrite = router.db.write.bind(router.db);
    let writeCount = 0;
    router.db.write = () => {
      writeCount += 1;
      return originalWrite();
    };
    const status = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/status",
      {
        method: "PATCH",
        body: JSON.stringify(statusBody({ idempotencyKey: "shared-operation-key" })),
      },
    );
    const stateAfterStatus = clone(router.db.getState());
    const crossOperation = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/add-ons",
      {
        method: "POST",
        body: JSON.stringify(addOnBody({ idempotencyKey: "shared-operation-key" })),
      },
    );

    assert.equal(status.status, 200);
    assert.deepEqual(Object.keys(status.body).sort(), [
      "auditEvent",
      "correlationId",
      "data",
      "message",
      "mockOnly",
      "warnings",
    ]);
    assert.equal(status.body.mockOnly, true);
    assert.equal(status.body.auditEvent.companyId, "company-test");
    assert.equal(crossOperation.status, 409);
    assert.equal(crossOperation.body.code, "IDEMPOTENCY_CONFLICT");
    assert.equal(writeCount, 1);
    assert.deepEqual(router.db.getState(), stateAfterStatus);
    assert.equal(router.db.getState().superCompanyManagementAuditEvents.length, 1);
  });
});

test("TESTS/COMPANY profile updates enforce allowlists, versioning, one write, and redacted audit data", async () => {
  const state = createState(createCompany());

  await withServer(state, async ({ baseUrl, router }) => {
    const originalWrite = router.db.write.bind(router.db);
    let writeCount = 0;
    router.db.write = () => {
      writeCount += 1;
      return originalWrite();
    };
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/profile/billingPayment",
      {
        method: "PATCH",
        body: JSON.stringify({
          changes: {
            paymentInformation: {
              accountOwner: "Test Company AG",
              IBAN: "DE9876543210",
              BIC: "UPDATEDBIC",
            },
          },
          version: 3,
          reason: "Verified billing account change",
        }),
      },
    );
    const nextState = router.db.getState();
    const nextCompany = nextState.superCompanyManagementCompanies[0];
    const audit = nextState.superCompanyManagementAuditEvents[0];

    assert.equal(result.status, 200);
    assert.equal(result.body.mockOnly, true);
    assert.equal(writeCount, 1);
    assert.equal(nextCompany.version, 4);
    assert.equal(nextCompany.profile.addressData.companyName, "Test Company GmbH");
    assert.deepEqual(nextCompany.profile.paymentInformation, {
      accountOwner: "Test Company AG",
      IBAN: "DE9876543210",
      BIC: "UPDATEDBIC",
    });
    assert.equal(nextState.superCompanyManagementAuditEvents.length, 1);
    assert.equal(audit.actionType, "company.profile.billingPayment.updated");
    assert.equal(audit.companyId, "company-test");
    assert.equal(audit.before.paymentInformation, "[REDACTED]");
    assert.equal(audit.after.paymentInformation, "[REDACTED]");
    assert.equal(audit.reason, "Verified billing account change");
  });
});

test("TESTS/COMPANY invalid, stale, and unauthorized profile updates leave all records unchanged", async () => {
  const cases = [
    {
      state: createState(createCompany()),
      section: "general",
      body: {
        changes: { addressData: { inventedField: "not writable" } },
        version: 3,
      },
      status: 400,
      code: "VALIDATION_ERROR",
    },
    {
      state: createState(createCompany()),
      section: "general",
      body: {
        changes: { addressData: { companyName: "Stale Company" } },
        version: 2,
      },
      status: 409,
      code: "VERSION_CONFLICT",
    },
    {
      state: createState(createCompany({ permissionProfile: "restricted" })),
      section: "general",
      body: {
        changes: { addressData: { companyName: "Forbidden Company" } },
        version: 3,
      },
      status: 403,
      code: "ACTION_NOT_ALLOWED",
    },
  ];

  for (const profileCase of cases) {
    await withServer(profileCase.state, async ({ baseUrl, router }) => {
      const before = clone(router.db.getState());
      const result = await requestJson(
        baseUrl,
        `/super/company-management/companies/company-test/profile/${profileCase.section}`,
        { method: "PATCH", body: JSON.stringify(profileCase.body) },
      );

      assert.equal(result.status, profileCase.status);
      assert.equal(result.body.code, profileCase.code);
      assert.deepEqual(router.db.getState(), before);
    });
  }
});

test("TESTS/COMPANY profile persistence failure restores company and audit state", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const write = router.db.write;
    router.db.write = () => {
      throw new Error("write failure");
    };
    try {
      const result = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/profile/general",
        {
          method: "PATCH",
          body: JSON.stringify({
            changes: { addressData: { companyName: "Test Company AG" } },
            version: 3,
          }),
        },
      );

      assert.equal(result.status, 500);
      assert.equal(result.body.code, "COMPANY_PROFILE_UPDATE_FAILED");
      assert.equal(typeof result.body.correlationId, "string");
      assert.deepEqual(router.db.getState(), before);
    } finally {
      router.db.write = write;
    }
  });
});

test("company role creation, duplication, metadata, and permission replacement are idempotent atomic writes", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const originalWrite = router.db.write.bind(router.db);
    let writeCount = 0;
    router.db.write = () => {
      writeCount += 1;
      return originalWrite();
    };
    const createRequest = {
      method: "POST",
      body: JSON.stringify(roleCreateBody()),
    };
    const created = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles",
      createRequest
    );
    const replay = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles",
      createRequest
    );
    const conflict = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles",
      {
        method: "POST",
        body: JSON.stringify(
          roleCreateBody({ changes: roleMetadata({ enName: "Different" }) })
        ),
      }
    );
    const createdRole = created.body.data.role;
    const duplicated = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-system/duplicate",
      {
        method: "POST",
        body: JSON.stringify(
          roleMutationBody({
            changes: roleMetadata({ enName: "Owner copy", deName: "Eigentümerkopie" }),
            idempotencyKey: "role-duplicate-1",
          })
        ),
      }
    );
    const edited = await requestJson(
      baseUrl,
      `/super/company-management/companies/company-test/roles/${createdRole.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          roleMutationBody({
            version: 1,
            changes: roleMetadata({ enName: "Updated support editor" }),
            idempotencyKey: "role-edit-1",
          })
        ),
      }
    );
    const permissions = await requestJson(
      baseUrl,
      `/super/company-management/companies/company-test/roles/${createdRole.id}/permissions`,
      {
        method: "PATCH",
        body: JSON.stringify(
          rolePermissionsBody({ version: 2, idempotencyKey: "role-permissions-created-1" })
        ),
      }
    );
    const state = router.db.getState();

    assert.equal(created.status, 200);
    assert.equal(created.body.data.role.isCustom, true);
    assert.equal(created.body.data.role.assignedUserCount, 0);
    assert.equal(replay.status, 200);
    assert.deepEqual(replay.body, created.body);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "IDEMPOTENCY_CONFLICT");
    assert.equal(duplicated.status, 200);
    assert.equal(duplicated.body.data.role.isSystem, false);
    assert.equal(duplicated.body.data.role.actionKeys.includes("VIEW_MEDIA"), true);
    assert.equal(edited.status, 200);
    assert.equal(permissions.status, 200);
    assert.deepEqual(permissions.body.data.role.actionKeys, ["VIEW_MEDIA"]);
    assert.equal(state.superCompanyManagementAuditEvents.length, 4);
    assert.equal(state.superCompanyManagementCompanies[0].summary.roleCount, 7);
    assert.equal(state.superCompanyManagementCompanies[0].summary.customRoleCount, 6);
    assert.equal(writeCount, 4);
  });
});

test("company role mutations reject immutable, unknown, unentitled, assigned, and cross-company roles", async () => {
  const initialState = createState(createCompany());
  const otherCompany = createCompany({ id: "company-other", onlineId: "CMP-OTHER" });
  initialState.superCompanyManagementCompanies.push(otherCompany);
  initialState.superCompanyManagementPackages.push({
    ...clone(initialState.superCompanyManagementPackages[0]),
    companyId: otherCompany.id,
  });
  await withServer(initialState, async ({ baseUrl, router }) => {
    const immutable = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-system",
      { method: "PATCH", body: JSON.stringify(roleMutationBody()) }
    );
    const unknownPermission = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-next/permissions",
      {
        method: "PATCH",
        body: JSON.stringify(
          rolePermissionsBody({ actions: [{ actionKey: "SUPER_ADMIN_ONLY", access: true }] })
        ),
      }
    );
    const entitlement = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-next/permissions",
      {
        method: "PATCH",
        body: JSON.stringify(
          rolePermissionsBody({ actions: [{ actionKey: "MANAGE_ROLE", access: true }], idempotencyKey: "role-entitlement-1" })
        ),
      }
    );
    const assigned = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-test",
      { method: "DELETE", body: JSON.stringify(roleDeleteBody({ version: 4 })) }
    );
    const crossCompany = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-other-company"
    );
    const state = router.db.getState();

    assert.equal(immutable.status, 409);
    assert.equal(immutable.body.code, "ROLE_IMMUTABLE");
    assert.equal(unknownPermission.status, 400);
    assert.equal(unknownPermission.body.code, "VALIDATION_ERROR");
    assert.equal(entitlement.status, 422);
    assert.equal(entitlement.body.code, "ROLE_ENTITLEMENT_REQUIRED");
    assert.equal(assigned.status, 422);
    assert.equal(assigned.body.code, "ROLE_ASSIGNED_USERS");
    assert.equal(assigned.body.affectedUserCount, 1);
    assert.deepEqual(assigned.body.affectedUserIds, ["user-test"]);
    assert.equal(crossCompany.status, 404);
    assert.equal(state.superCompanyManagementAuditEvents.length, 0);
  });
});

test("company role counts are derived from scoped users and stale or failed writes persist nothing", async () => {
  const initialState = createState(createCompany());
  initialState.superCompanyManagementRoles.find((role) => role.id === "role-test").assignedUserCount = 99;
  await withServer(initialState, async ({ baseUrl, router }) => {
    const initialRoles = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles"
    );
    const reassigned = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test",
      { method: "PATCH", body: JSON.stringify(userRoleBody()) }
    );
    const updatedRoles = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles"
    );
    const before = clone(router.db.getState());
    const stale = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/roles/role-next",
      { method: "PATCH", body: JSON.stringify(roleMutationBody({ version: 0 })) }
    );

    assert.equal(initialRoles.status, 200);
    assert.equal(initialRoles.body.find((role) => role.id === "role-test").assignedUserCount, 1);
    assert.equal(reassigned.status, 200);
    assert.equal(updatedRoles.body.find((role) => role.id === "role-test").assignedUserCount, 0);
    assert.equal(updatedRoles.body.find((role) => role.id === "role-next").assignedUserCount, 1);
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "VERSION_CONFLICT");
    assert.deepEqual(router.db.getState(), before);

    const write = router.db.write;
    router.db.write = () => {
      throw new Error("write failure");
    };
    try {
      const failure = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/roles/role-next",
        { method: "PATCH", body: JSON.stringify(roleMutationBody({ version: 1 })) }
      );
      assert.equal(failure.status, 500);
      assert.equal(failure.body.code, "COMPANY_ROLE_UPDATE_FAILED");
      assert.deepEqual(router.db.getState(), before);
    } finally {
      router.db.write = write;
    }
  });
});

test("company user edits accept only allowlisted assignment metadata and create redacted audit", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const edit = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test",
      { method: "PATCH", body: JSON.stringify(userEditBody()) }
    );
    const afterEdit = clone(router.db.getState());
    const invalid = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test",
      {
        method: "PATCH",
        body: JSON.stringify(
          userEditBody({ version: 3, changes: { email: "outside-scope@example.test", actionKeys: ["MANAGE_ROLE"] } })
        ),
      }
    );

    assert.equal(edit.status, 200);
    assert.equal(edit.body.mockOnly, true);
    assert.equal(router.db.getState().superCompanyManagementUsers[0].departmentId, "customer-success");
    assert.equal(router.db.getState().superCompanyManagementUsers[0].email, "user@example.test");
    assert.equal(edit.body.auditEvent.actionType, "company.user.edited");
    assert.deepEqual(edit.body.auditEvent.after, {
      departmentId: "customer-success",
      departmentTitle: "Customer success",
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, "VALIDATION_ERROR");
    assert.deepEqual(router.db.getState(), afterEdit);
  });
});

test("company user role assignment is scoped, assignable, entitled, and updates role counts atomically", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const assigned = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test",
      { method: "PATCH", body: JSON.stringify(userRoleBody()) }
    );
    const state = router.db.getState();
    const foreign = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test",
      { method: "PATCH", body: JSON.stringify(userRoleBody({ version: 3, changes: { roleId: "role-other-company" }, idempotencyKey: "role-foreign" })) }
    );
    const locked = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test",
      { method: "PATCH", body: JSON.stringify(userRoleBody({ version: 3, changes: { roleId: "role-locked" }, idempotencyKey: "role-locked" })) }
    );
    const entitlement = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test",
      { method: "PATCH", body: JSON.stringify(userRoleBody({ version: 3, changes: { roleId: "role-entitled" }, idempotencyKey: "role-entitled" })) }
    );

    assert.equal(assigned.status, 200);
    assert.equal(state.superCompanyManagementUsers[0].roleId, "role-next");
    assert.equal(state.superCompanyManagementRoles.find((role) => role.id === "role-test").assignedUserCount, 0);
    assert.equal(state.superCompanyManagementRoles.find((role) => role.id === "role-next").assignedUserCount, 1);
    for (const result of [foreign, locked, entitlement]) {
      assert.equal(result.status, 422);
      assert.equal(result.body.code, "ROLE_ASSIGNMENT_NOT_ALLOWED");
    }
    assert.equal(state.superCompanyManagementUsers[0].roleId, "role-next");
  });
});

test("company user status and mock 2FA actions enforce authorization, versions, idempotency, and exact effects", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const paused = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test/status",
      { method: "PATCH", body: JSON.stringify(userStatusBody()) }
    );
    const activated = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test/status",
      { method: "PATCH", body: JSON.stringify(userStatusBody({ targetStatus: "active", version: 3, idempotencyKey: "user-status-request-2" })) }
    );
    const stale = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test/status",
      { method: "PATCH", body: JSON.stringify(userStatusBody({ version: 2, idempotencyKey: "user-status-stale" })) }
    );
    const resetRequest = {
      method: "POST",
      body: JSON.stringify(userTwoFactorBody({ version: 4 })),
    };
    const reset = await requestJson(baseUrl, "/super/company-management/companies/company-test/users/user-test/2fa-reset", resetRequest);
    const replay = await requestJson(baseUrl, "/super/company-management/companies/company-test/users/user-test/2fa-reset", resetRequest);
    const user = router.db.getState().superCompanyManagementUsers[0];

    assert.equal(paused.status, 200);
    assert.equal(paused.body.data.user.status, "paused");
    assert.equal(paused.body.data.user.isSystemInactive, true);
    assert.equal(activated.status, 200);
    assert.equal(activated.body.data.user.status, "active");
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "VERSION_CONFLICT");
    assert.equal(reset.status, 200);
    assert.deepEqual(replay.body, reset.body);
    assert.equal(user.twoFactor.enabled, false);
    assert.equal(typeof user.twoFactor.lastResetAt, "string");
    assert.equal(user.version, 5);
    assert.equal(reset.body.data.impact.mockOnly, true);
    assert.equal(JSON.stringify(reset.body.data.impact).includes("recovery"), true);
    assert.equal(JSON.stringify(reset.body.data.impact).includes("token"), false);
  });

  const unauthorizedState = createState(createCompany());
  unauthorizedState.superCompanyManagementUsers[0].allowedActions = ["EDIT_COMPANY_USER"];
  await withServer(unauthorizedState, async ({ baseUrl }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/users/user-test/status",
      { method: "PATCH", body: JSON.stringify(userStatusBody()) }
    );
    assert.equal(result.status, 403);
  });
});

test("company user mutation persistence failure restores all state", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const write = router.db.write;
    router.db.write = () => {
      throw new Error("write failure");
    };
    try {
      const result = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/users/user-test",
        { method: "PATCH", body: JSON.stringify(userRoleBody()) }
      );
      assert.equal(result.status, 500);
      assert.equal(result.body.code, "COMPANY_USER_UPDATE_FAILED");
      assert.deepEqual(router.db.getState(), before);
    } finally {
      router.db.write = write;
    }
  });
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

test("an unlimited tariff dimension accepts usage above finite display limits", async () => {
  const initialState = createState(createCompany());
  initialState.superCompanyManagementPackages[0].resourceUsage.displays = 10_000;

  await withServer(initialState, async ({ baseUrl, router }) => {
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/subscription",
      {
        method: "PATCH",
        body: JSON.stringify(
          tariffBody({ idempotencyKey: "unlimited-display-limit-1" }),
        ),
      },
    );

    assert.equal(result.status, 200);
    assert.equal(
      router.db.getState().superCompanyManagementPackages[0].tariff.tariffId,
      "plus",
    );
  });
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

test("company approvals expose both safe detail types and apply only accepted canonical changes", async () => {
  const company = createCompany({ registrationStatus: "pending" });
  await withServer(createState(company), async ({ baseUrl, router }) => {
    const registrationDetail = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test",
    );
    const profileDetail = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-profile",
    );

    assert.equal(registrationDetail.status, 200);
    assert.equal(registrationDetail.body.data.type, "REGISTRATION");
    assert.equal(
      registrationDetail.body.data.registrationSnapshot.profile.paymentInformation,
      "[REDACTED]",
    );
    assert.deepEqual(
      registrationDetail.body.data.registrationSnapshot.medias.businessLicense[0],
      {
        uid: "license-test",
        name: "business-license.pdf",
        type: "application/pdf",
        status: "done",
      },
    );
    assert.equal(
      registrationDetail.body.data.registrationSnapshot.medias.businessLicense[0].url,
      undefined,
    );
    assert.equal(profileDetail.status, 200);
    assert.equal(profileDetail.body.data.type, "PROFILE_EDIT");
    assert.equal(
      profileDetail.body.data.requestedInfo.addressData.companyName,
      "Test Company AG",
    );

    const approveRegistration = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      {
        method: "PATCH",
        body: JSON.stringify(approvalDecisionBody()),
      },
    );
    const approveProfileEdit = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-profile/decision",
      {
        method: "PATCH",
        body: JSON.stringify(
          approvalDecisionBody({
            version: 2,
            idempotencyKey: "approval-profile-approve-1",
          }),
        ),
      },
    );
    const state = router.db.getState();
    const nextCompany = state.superCompanyManagementCompanies[0];
    const registration = state.superCompanyManagementApprovals.find(
      (item) => item.id === "approval-test",
    );
    const profileEdit = state.superCompanyManagementApprovals.find(
      (item) => item.id === "approval-profile",
    );

    assert.equal(approveRegistration.status, 200);
    assert.equal(approveRegistration.body.mockOnly, true);
    assert.equal(approveRegistration.body.data.approval.status, "APPROVED");
    assert.equal(approveProfileEdit.status, 200);
    assert.equal(nextCompany.registrationStatus, "approved");
    assert.equal(nextCompany.profile.addressData.city, "Berlin");
    assert.equal(nextCompany.profile.addressData.companyName, "Test Company AG");
    assert.equal(nextCompany.profile.legalPerson.firstName, "Test");
    assert.equal(nextCompany.summary.pendingApprovalCount, 0);
    assert.equal(registration.history.length, 1);
    assert.equal(profileEdit.history.length, 1);
    assert.equal(state.superCompanyManagementAuditEvents.length, 2);
    assert.equal(state.superCompanyManagementIdempotency.length, 2);
  });
});

test("company approval decisions enforce transitions, messages, scope, authorization, and idempotency", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    const missingCorrectionMessage = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      {
        method: "PATCH",
        body: JSON.stringify(
          approvalDecisionBody({
            status: "ON_CORRECTION",
            idempotencyKey: "approval-correction-missing-message",
          }),
        ),
      },
    );
    const missingRejectionMessage = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      {
        method: "PATCH",
        body: JSON.stringify(
          approvalDecisionBody({
            status: "REJECTED",
            idempotencyKey: "approval-rejection-missing-message",
          }),
        ),
      },
    );
    assert.equal(missingCorrectionMessage.status, 400);
    assert.equal(missingCorrectionMessage.body.fieldErrors.message[0], "A message is required for this decision");
    assert.equal(missingRejectionMessage.status, 400);
    assert.deepEqual(router.db.getState(), before);

    const originalWrite = router.db.write.bind(router.db);
    let writeCount = 0;
    router.db.write = () => {
      writeCount += 1;
      return originalWrite();
    };
    const correctionRequest = {
      method: "PATCH",
      body: JSON.stringify(
        approvalDecisionBody({
          status: "ON_CORRECTION",
          message: "Please correct the submitted address.",
          idempotencyKey: "approval-correction-1",
        }),
      ),
    };
    const correction = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      correctionRequest,
    );
    const replay = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      correctionRequest,
    );
    const mismatch = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      {
        method: "PATCH",
        body: JSON.stringify(
          approvalDecisionBody({
            status: "ON_CORRECTION",
            message: "Different message",
            idempotencyKey: "approval-correction-1",
          }),
        ),
      },
    );
    const approveFromCorrection = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      {
        method: "PATCH",
        body: JSON.stringify(
          approvalDecisionBody({
            version: 2,
            idempotencyKey: "approval-approve-after-correction-1",
          }),
        ),
      },
    );
    const finalRetry = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      {
        method: "PATCH",
        body: JSON.stringify(
          approvalDecisionBody({
            version: 3,
            idempotencyKey: "approval-final-retry-1",
          }),
        ),
      },
    );
    const stale = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-profile/decision",
      {
        method: "PATCH",
        body: JSON.stringify(
          approvalDecisionBody({ version: 99, idempotencyKey: "approval-stale-1" }),
        ),
      },
    );
    const crossCompany = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-other-company/decision",
      { method: "PATCH", body: JSON.stringify(approvalDecisionBody({ idempotencyKey: "approval-cross-company-1" })) },
    );

    assert.equal(correction.status, 200);
    assert.equal(correction.body.data.approval.status, "ON_CORRECTION");
    assert.equal(replay.status, 200);
    assert.deepEqual(replay.body, correction.body);
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.code, "IDEMPOTENCY_CONFLICT");
    assert.equal(approveFromCorrection.status, 200);
    assert.equal(finalRetry.status, 409);
    assert.equal(finalRetry.body.code, "INVALID_STATUS_TRANSITION");
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "VERSION_CONFLICT");
    assert.equal(crossCompany.status, 404);
    assert.equal(writeCount, 2);
    assert.equal(router.db.getState().superCompanyManagementAuditEvents.length, 2);
    assert.equal(router.db.getState().superCompanyManagementApprovals.find((item) => item.id === "approval-test").history.length, 2);
  });

  await withServer(
    createState(createCompany({ permissionProfile: "restricted" })),
    async ({ baseUrl, router }) => {
      const before = clone(router.db.getState());
      const unauthorized = await requestJson(
        baseUrl,
        "/super/company-management/companies/company-test/approvals/approval-test/decision",
        { method: "PATCH", body: JSON.stringify(approvalDecisionBody()) },
      );
      assert.equal(unauthorized.status, 403);
      assert.equal(unauthorized.body.code, "ACTION_NOT_ALLOWED");
      assert.deepEqual(router.db.getState(), before);
    },
  );
});

test("company approval decision persistence failures leave approval, company, history, audit, and idempotency unchanged", async () => {
  await withServer(createState(createCompany()), async ({ baseUrl, router }) => {
    const before = clone(router.db.getState());
    router.db.write = () => {
      throw new Error("write failure");
    };
    const result = await requestJson(
      baseUrl,
      "/super/company-management/companies/company-test/approvals/approval-test/decision",
      { method: "PATCH", body: JSON.stringify(approvalDecisionBody()) },
    );

    assert.equal(result.status, 500);
    assert.equal(result.body.code, "COMPANY_APPROVAL_DECISION_FAILED");
    assert.deepEqual(router.db.getState(), before);
  });
});

test("demo platform users are filtered, paginated, and do not expose company-scoped actions", async () => {
  const company = createCompany();
  const otherCompany = createCompany({
    id: "company-other",
    onlineId: "CMP-OTHER",
    profile: {
      ...company.profile,
      addressData: {
        ...company.profile.addressData,
        companyName: "Other Company GmbH",
      },
    },
  });
  const state = createState(company);
  state.superCompanyManagementCompanies.push(otherCompany);
  state.superCompanyManagementUsers[0] = {
    ...state.superCompanyManagementUsers[0],
    firstName: "Alex",
    entryDate: "2026-01-10T00:00:00.000Z",
    lastActivity: "2026-02-10T00:00:00.000Z",
    userType: "companyUser",
    employmentType: "internal",
  };
  state.superCompanyManagementUsers.push({
    ...state.superCompanyManagementUsers[0],
    id: "user-other",
    companyId: otherCompany.id,
    email: "alex.other@example.test",
    firstName: "Alex",
    lastName: "Other",
    onlineId: "USR-OTHER",
    status: "paused",
    employmentType: "external",
    entryDate: "2026-03-10T00:00:00.000Z",
    lastActivity: "2026-03-11T00:00:00.000Z",
  });

  await withServer(state, async ({ baseUrl }) => {
    const filtered = await requestJson(
      baseUrl,
      "/super/company-management/demo/platform-users?keyword=alex&email=user%40example.test&companyId=company-test&status=active&userType=companyUser&employmentType=internal&departmentId=support&categoryId=operations&roleId=role-test&entryFrom=2026-01-01&entryTo=2026-01-31&lastActivityFrom=2026-02-01&lastActivityTo=2026-02-28&sortBy=email&sortOrder=asc&page=1&pageSize=10",
    );
    const unfiltered = await requestJson(
      baseUrl,
      "/super/company-management/demo/platform-users",
    );
    const paginated = await requestJson(
      baseUrl,
      "/super/company-management/demo/platform-users?sortBy=onlineId&sortOrder=asc&page=2&pageSize=1",
    );
    const invalid = await requestJson(
      baseUrl,
      "/super/company-management/demo/platform-users?status=deleted",
    );
    const unknown = await requestJson(
      baseUrl,
      "/super/company-management/demo/platform-users?unsupported=true",
    );
    const invalidSort = await requestJson(
      baseUrl,
      "/super/company-management/demo/platform-users?sortBy=role",
    );

    assert.equal(filtered.status, 200);
    assert.deepEqual(filtered.body.items.map((item) => item.id), ["user-test"]);
    assert.equal(filtered.body.items[0].company.name, "Test Company GmbH");
    assert.equal("allowedActions" in filtered.body.items[0], false);
    assert.equal(filtered.body.totalCount, 1);
    assert.equal(unfiltered.body.totalCount, 2);
    assert.deepEqual(
      new Set(unfiltered.body.items.map((item) => item.companyId)),
      new Set(["company-test", "company-other"]),
    );
    assert.equal(paginated.body.totalCount, 2);
    assert.equal(paginated.body.page, 2);
    assert.equal(paginated.body.pageSize, 1);
    assert.deepEqual(paginated.body.items.map((item) => item.id), ["user-test"]);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, "INVALID_FILTER_VALUE");
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.code, "UNKNOWN_QUERY_PARAMETER");
    assert.equal(invalidSort.status, 400);
    assert.equal(invalidSort.body.code, "INVALID_SORT_FIELD");
  });
});
