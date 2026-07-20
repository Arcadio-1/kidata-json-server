const express = require("express");

const ROOT = "/super/company-management";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const ACTIONS = Object.freeze({
  VIEW_COMPANY: "VIEW_COMPANY",
  VIEW_COMPANY_SENSITIVE_BILLING: "VIEW_COMPANY_SENSITIVE_BILLING",
  VIEW_COMPANY_IDENTITY_DOCUMENTS: "VIEW_COMPANY_IDENTITY_DOCUMENTS",
  EDIT_COMPANY_GENERAL: "EDIT_COMPANY_GENERAL",
  EDIT_COMPANY_ADMINISTRATOR: "EDIT_COMPANY_ADMINISTRATOR",
  EDIT_COMPANY_BUSINESS_TAX: "EDIT_COMPANY_BUSINESS_TAX",
  EDIT_COMPANY_BILLING_PAYMENT: "EDIT_COMPANY_BILLING_PAYMENT",
  MANAGE_COMPANY_DOCUMENTS: "MANAGE_COMPANY_DOCUMENTS",
  SUSPEND_COMPANY: "SUSPEND_COMPANY",
  REACTIVATE_COMPANY: "REACTIVATE_COMPANY",
  VIEW_COMPANY_SUBSCRIPTION: "VIEW_COMPANY_SUBSCRIPTION",
  CHANGE_COMPANY_TARIFF: "CHANGE_COMPANY_TARIFF",
  ASSIGN_COMPANY_ADD_ON: "ASSIGN_COMPANY_ADD_ON",
  CHANGE_COMPANY_ADD_ON_QUANTITY: "CHANGE_COMPANY_ADD_ON_QUANTITY",
  REMOVE_COMPANY_ADD_ON: "REMOVE_COMPANY_ADD_ON",
  APPLY_COMPANY_OFFER: "APPLY_COMPANY_OFFER",
  VIEW_COMPANY_USERS: "VIEW_COMPANY_USERS",
  EDIT_COMPANY_USER: "EDIT_COMPANY_USER",
  ASSIGN_COMPANY_USER_ROLE: "ASSIGN_COMPANY_USER_ROLE",
  SET_COMPANY_USER_STATUS: "SET_COMPANY_USER_STATUS",
  RESET_COMPANY_USER_TWO_FACTOR: "RESET_COMPANY_USER_TWO_FACTOR",
  VIEW_COMPANY_ROLES: "VIEW_COMPANY_ROLES",
  CREATE_COMPANY_ROLE: "CREATE_COMPANY_ROLE",
  DUPLICATE_COMPANY_ROLE: "DUPLICATE_COMPANY_ROLE",
  EDIT_COMPANY_ROLE: "EDIT_COMPANY_ROLE",
  SET_COMPANY_ROLE_PERMISSIONS: "SET_COMPANY_ROLE_PERMISSIONS",
  DELETE_COMPANY_ROLE: "DELETE_COMPANY_ROLE",
  VIEW_COMPANY_APPROVAL_QUEUE: "VIEW_COMPANY_APPROVAL_QUEUE",
  VIEW_COMPANY_APPROVALS: "VIEW_COMPANY_APPROVALS",
  DECIDE_COMPANY_APPROVAL: "DECIDE_COMPANY_APPROVAL",
  VIEW_COMPANY_AUDIT_LOG: "VIEW_COMPANY_AUDIT_LOG",
});

const ALL_ACTIONS = Object.freeze(Object.values(ACTIONS));
const RESTRICTED_ACTIONS = Object.freeze([
  ACTIONS.VIEW_COMPANY,
  ACTIONS.VIEW_COMPANY_SUBSCRIPTION,
  ACTIONS.VIEW_COMPANY_USERS,
  ACTIONS.VIEW_COMPANY_ROLES,
  ACTIONS.VIEW_COMPANY_APPROVALS,
  ACTIONS.VIEW_COMPANY_AUDIT_LOG,
]);

const PROFILE_SECTION_CONTRACTS = Object.freeze({
  general: Object.freeze({
    action: ACTIONS.EDIT_COMPANY_GENERAL,
    groups: Object.freeze(["addressData", "legalPerson"]),
  }),
  administrator: Object.freeze({
    action: ACTIONS.EDIT_COMPANY_ADMINISTRATOR,
    groups: Object.freeze(["administrator"]),
  }),
  businessTax: Object.freeze({
    action: ACTIONS.EDIT_COMPANY_BUSINESS_TAX,
    groups: Object.freeze(["businessModel", "industry", "tax"]),
  }),
  billingPayment: Object.freeze({
    action: ACTIONS.EDIT_COMPANY_BILLING_PAYMENT,
    groups: Object.freeze([
      "billingAddress",
      "paymentInformation",
      "receiveEmail",
    ]),
    requiresReason: true,
  }),
});

const SENSITIVE_AUDIT_KEY =
  /(?:iban|bic|accountowner|payment|password|secret|token|twofactor|2fa|identity|idcard)/i;

const clone = (value) => JSON.parse(JSON.stringify(value));

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const redactAuditValue = (value, key = "") => {
  if (SENSITIVE_AUDIT_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditValue(item));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        redactAuditValue(nestedValue, nestedKey),
      ])
    );
  }
  return value;
};

const sendError = (res, status, code, message, extra = {}) =>
  res.status(status).json({ message, code, ...extra });

const parsePositiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, max)
    : fallback;
};

const normalizeForSort = (value) => {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).getTime();
  }
  return String(value).toLowerCase();
};

const stableSort = (items, sortBy, sortOrder) => {
  const direction = sortOrder === "asc" ? 1 : -1;
  return items.slice().sort((left, right) => {
    const leftValue = normalizeForSort(left[sortBy]);
    const rightValue = normalizeForSort(right[sortBy]);
    if (leftValue < rightValue) return -direction;
    if (leftValue > rightValue) return direction;
    return String(left.id).localeCompare(String(right.id));
  });
};

const paginate = (items, query) => {
  const page = parsePositiveInt(query.page, 1);
  const pageSize = parsePositiveInt(
    query.pageSize,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );
  const totalCount = items.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
  };
};

const validateQuery = (req, res, allowed, sortable) => {
  const unknown = Object.keys(req.query).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    sendError(res, 400, "UNKNOWN_QUERY_PARAMETER", "Unsupported query parameter", {
      fieldErrors: Object.fromEntries(
        unknown.map((key) => [key, ["Unsupported query parameter"]])
      ),
    });
    return false;
  }
  if (req.query.sortBy && !sortable.includes(req.query.sortBy)) {
    sendError(res, 400, "INVALID_SORT_FIELD", "Unsupported sort field", {
      fieldErrors: { sortBy: ["Unsupported sort field"] },
    });
    return false;
  }
  if (req.query.sortOrder && !["asc", "desc"].includes(req.query.sortOrder)) {
    sendError(res, 400, "INVALID_SORT_ORDER", "sortOrder must be asc or desc", {
      fieldErrors: { sortOrder: ["Expected asc or desc"] },
    });
    return false;
  }
  return true;
};

const validateEnumQuery = (req, res, key, values) => {
  if (!req.query[key] || values.includes(req.query[key])) return true;
  sendError(res, 400, "INVALID_FILTER_VALUE", `Unsupported ${key} value`, {
    fieldErrors: { [key]: [`Expected one of: ${values.join(", ")}`] },
  });
  return false;
};

const sortApprovalQueue = (items, query) => {
  if (query.sortBy) {
    return stableSort(items, query.sortBy, query.sortOrder || "asc");
  }
  return items.slice().sort((left, right) => {
    const leftRank = ["PENDING", "ON_CORRECTION"].includes(left.status) ? 0 : 1;
    const rightRank = ["PENDING", "ON_CORRECTION"].includes(right.status) ? 0 : 1;
    if (leftRank !== rightRank) return leftRank - rightRank;
    const dateComparison = left.submittedAt.localeCompare(right.submittedAt);
    return dateComparison || left.id.localeCompare(right.id);
  });
};

const getCompany = (db, companyId) =>
  db.get("superCompanyManagementCompanies").find({ id: companyId }).value();

const requireCompany = (db, res, companyId) => {
  const company = getCompany(db, companyId);
  if (!company) {
    sendError(res, 404, "COMPANY_NOT_FOUND", "Company not found");
    return null;
  }
  return company;
};

const getCompanyActions = (company) => {
  if (company.permissionProfile === "restricted") {
    return [...RESTRICTED_ACTIONS];
  }
  return ALL_ACTIONS.filter((action) => {
    if (action === ACTIONS.SUSPEND_COMPANY) {
      return company.operationalStatus === "active";
    }
    if (action === ACTIONS.REACTIVATE_COMPANY) {
      return company.operationalStatus === "suspended";
    }
    return true;
  });
};

const requireViewAction = (company, action, res) => {
  if (getCompanyActions(company).includes(action)) return true;
  sendError(
    res,
    403,
    "ACTION_NOT_ALLOWED",
    "The mock operator cannot view this company resource"
  );
  return false;
};

const getRoleActions = (company, role) => {
  const companyActions = getCompanyActions(company);
  const actions = [];
  if (companyActions.includes(ACTIONS.VIEW_COMPANY_ROLES)) {
    actions.push(ACTIONS.VIEW_COMPANY_ROLES);
  }
  if (companyActions.includes(ACTIONS.DUPLICATE_COMPANY_ROLE)) {
    actions.push(ACTIONS.DUPLICATE_COMPANY_ROLE);
  }
  if (role.isMutable && companyActions.includes(ACTIONS.EDIT_COMPANY_ROLE)) {
    actions.push(ACTIONS.EDIT_COMPANY_ROLE);
  }
  if (
    role.isMutable &&
    companyActions.includes(ACTIONS.SET_COMPANY_ROLE_PERMISSIONS)
  ) {
    actions.push(ACTIONS.SET_COMPANY_ROLE_PERMISSIONS);
  }
  if (
    role.isCustom &&
    role.assignedUserCount === 0 &&
    companyActions.includes(ACTIONS.DELETE_COMPANY_ROLE)
  ) {
    actions.push(ACTIONS.DELETE_COMPANY_ROLE);
  }
  return actions;
};

const getApprovalActions = (company, approval) => {
  const companyActions = getCompanyActions(company);
  const actions = [];
  if (companyActions.includes(ACTIONS.VIEW_COMPANY_APPROVALS)) {
    actions.push(ACTIONS.VIEW_COMPANY_APPROVALS);
  }
  if (
    ["PENDING", "ON_CORRECTION"].includes(approval.status) &&
    companyActions.includes(ACTIONS.DECIDE_COMPANY_APPROVAL)
  ) {
    actions.push(ACTIONS.DECIDE_COMPANY_APPROVAL);
  }
  return actions;
};

const getTariffs = (db) =>
  (db.get("tariff").get("tariffsList").value() || []).map(
    ({ alternativeId, ...tariff }) => ({
      ...tariff,
      price: Number(tariff.price),
    })
  );

const getAddOns = (db) =>
  (db.get("addOns").get("addOns").value() || []).map(
    ({ isActive, currentQuantity, tags, ...addOn }) => ({
      ...addOn,
      tags: (tags || []).filter((tag) => tag !== "active"),
    })
  );

const projectCompany = (company, tariffs) => {
  const tariff = tariffs.find(
    (item) => item.id === company.subscription.currentTariffId
  );
  return {
    id: company.id,
    onlineId: company.onlineId,
    companyName: company.profile.addressData.companyName,
    logoThumbUrl: company.medias.logo[0]?.thumbUrl || null,
    responsibleContact: {
      firstName: company.profile.legalPerson.firstName,
      lastName: company.profile.legalPerson.lastName,
      email: company.profile.addressData.email,
    },
    country: {
      id: company.profile.addressData.countryId,
      label: company.profile.addressData.countryLabel,
    },
    operationalStatus: company.operationalStatus,
    registrationStatus: company.registrationStatus,
    tariff: tariff
      ? { id: tariff.id, name: tariff.name, level: tariff.level }
      : null,
    userCount: company.summary.userCount,
    pendingApprovalCount: company.summary.pendingApprovalCount,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    allowedActions: [ACTIONS.VIEW_COMPANY],
  };
};

const maskCompany = (company, allowedActions) => {
  const output = clone(company);
  delete output.permissionProfile;
  if (!allowedActions.includes(ACTIONS.VIEW_COMPANY_SENSITIVE_BILLING)) {
    const payment = output.profile?.paymentInformation;
    if (payment) {
      payment.accountOwner = payment.accountOwner ? "••••••••" : "";
      payment.IBAN = payment.IBAN
        ? `•••• ${String(payment.IBAN).slice(-4)}`
        : "";
      payment.BIC = payment.BIC ? "••••••••" : "";
    }
  }
  if (!allowedActions.includes(ACTIONS.VIEW_COMPANY_IDENTITY_DOCUMENTS)) {
    output.medias.businessLicense = [];
    output.medias.idCard = [];
  }
  return output;
};

const validateProfileChanges = (profile, contract, changes) => {
  const fieldErrors = {};
  if (!isPlainObject(changes) || Object.keys(changes).length === 0) {
    return { changes: null, fieldErrors: { changes: ["Provide at least one change"] } };
  }

  const unknownGroups = Object.keys(changes).filter(
    (group) => !contract.groups.includes(group)
  );
  for (const group of unknownGroups) {
    fieldErrors[`changes.${group}`] = ["Field is not writable in this section"];
  }

  const validated = {};
  for (const group of contract.groups) {
    if (!Object.prototype.hasOwnProperty.call(changes, group)) continue;
    const currentValue = profile[group];
    const nextValue = changes[group];

    if (isPlainObject(currentValue)) {
      if (!isPlainObject(nextValue)) {
        fieldErrors[`changes.${group}`] = ["Expected an object"];
        continue;
      }
      const unknownFields = Object.keys(nextValue).filter(
        (field) => !Object.prototype.hasOwnProperty.call(currentValue, field)
      );
      for (const field of unknownFields) {
        fieldErrors[`changes.${group}.${field}`] = [
          "Field is not writable in this section",
        ];
      }
      const groupChanges = {};
      for (const [field, value] of Object.entries(nextValue)) {
        if (unknownFields.includes(field)) continue;
        const currentFieldValue = currentValue[field];
        const hasCompatibleType =
          value === null
            ? currentFieldValue === null
            : typeof value === typeof currentFieldValue ||
              (["number", "string"].includes(typeof value) &&
                ["number", "string"].includes(typeof currentFieldValue));
        if (!hasCompatibleType || typeof value === "object") {
          fieldErrors[`changes.${group}.${field}`] = ["Invalid field value"];
          continue;
        }
        if (
          group === "paymentInformation" &&
          typeof value === "string" &&
          value.includes("•")
        ) {
          fieldErrors[`changes.${group}.${field}`] = [
            "Masked values cannot be submitted",
          ];
          continue;
        }
        groupChanges[field] = value;
      }
      if (Object.keys(groupChanges).length > 0) validated[group] = groupChanges;
      continue;
    }

    if (typeof nextValue !== typeof currentValue || typeof nextValue === "object") {
      fieldErrors[`changes.${group}`] = ["Invalid field value"];
      continue;
    }
    validated[group] = nextValue;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { changes: null, fieldErrors };
  }
  if (Object.keys(validated).length === 0) {
    return { changes: null, fieldErrors: { changes: ["Provide at least one change"] } };
  }
  return { changes: validated, fieldErrors: null };
};

const mergeProfileChanges = (profile, changes) => {
  const nextProfile = clone(profile);
  for (const [group, value] of Object.entries(changes)) {
    nextProfile[group] = isPlainObject(value)
      ? { ...nextProfile[group], ...value }
      : value;
  }
  return nextProfile;
};

const calculatePackageProjection = (db, packageRecord, companyActions) => {
  const output = clone(packageRecord);
  const tariff = getTariffs(db).find(
    (item) => item.id === output.tariff.tariffId
  );
  const addOns = getAddOns(db);
  const activeAddOns = output.addOns.filter((item) => item.status === "active");
  const addOnsMonthly = activeAddOns.reduce((sum, assignment) => {
    const catalog = addOns.find((item) => item.id === assignment.addOnId);
    return sum + Number(catalog?.price || assignment.unitPrice || 0) * assignment.quantity;
  }, 0);
  output.pricing.tariffMonthly = Number(tariff?.price || 0);
  output.pricing.addOnsMonthly = Number(addOnsMonthly.toFixed(2));
  output.pricing.totalMonthly = Number(
    Math.max(
      0,
      output.pricing.tariffMonthly +
        output.pricing.addOnsMonthly -
        output.pricing.discountMonthly
    ).toFixed(2)
  );
  output.entitlements = {
    ...(tariff?.details || {}),
    ...(output.addOnEntitlements || {}),
  };
  output.allowedActions = companyActions.filter((action) =>
    [
      ACTIONS.VIEW_COMPANY_SUBSCRIPTION,
      ACTIONS.CHANGE_COMPANY_TARIFF,
      ACTIONS.ASSIGN_COMPANY_ADD_ON,
      ACTIONS.CHANGE_COMPANY_ADD_ON_QUANTITY,
      ACTIONS.REMOVE_COMPANY_ADD_ON,
      ACTIONS.APPLY_COMPANY_OFFER,
    ].includes(action)
  );
  delete output.addOnEntitlements;
  delete output.offers;
  return output;
};

module.exports = function registerCompanyManagementRoutes(server, router) {
  server.use(ROOT, express.json());

  server.get(`${ROOT}/companies`, (req, res) => {
    const allowed = [
      "keyword",
      "operationalStatus",
      "registrationStatus",
      "tariffId",
      "countryId",
      "pendingAction",
      "createdFrom",
      "createdTo",
      "page",
      "pageSize",
      "sortBy",
      "sortOrder",
    ];
    const sortable = [
      "companyName",
      "onlineId",
      "operationalStatus",
      "registrationStatus",
      "createdAt",
      "updatedAt",
    ];
    if (!validateQuery(req, res, allowed, sortable)) return;
    if (
      !validateEnumQuery(req, res, "operationalStatus", ["active", "suspended"]) ||
      !validateEnumQuery(req, res, "registrationStatus", [
        "draft",
        "pending",
        "onCorrection",
        "approved",
        "rejected",
      ]) ||
      !validateEnumQuery(req, res, "pendingAction", ["true", "false"])
    ) {
      return;
    }
    const tariffs = getTariffs(router.db);
    let items = (
      router.db.get("superCompanyManagementCompanies").value() || []
    ).map((company) => projectCompany(company, tariffs));
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    if (keyword) {
      items = items.filter((item) =>
        [
          item.companyName,
          item.onlineId,
          item.responsibleContact.firstName,
          item.responsibleContact.lastName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      );
    }
    if (req.query.operationalStatus) {
      items = items.filter(
        (item) => item.operationalStatus === req.query.operationalStatus
      );
    }
    if (req.query.registrationStatus) {
      items = items.filter(
        (item) => item.registrationStatus === req.query.registrationStatus
      );
    }
    if (req.query.tariffId) {
      items = items.filter((item) => item.tariff?.id === req.query.tariffId);
    }
    if (req.query.countryId) {
      items = items.filter((item) => item.country.id === req.query.countryId);
    }
    if (req.query.pendingAction === "true") {
      items = items.filter((item) => item.pendingApprovalCount > 0);
    }
    if (req.query.pendingAction === "false") {
      items = items.filter((item) => item.pendingApprovalCount === 0);
    }
    if (req.query.createdFrom) {
      items = items.filter((item) => item.createdAt >= req.query.createdFrom);
    }
    if (req.query.createdTo) {
      items = items.filter((item) => item.createdAt <= req.query.createdTo);
    }
    res.json(
      paginate(
        stableSort(
          items,
          req.query.sortBy || "updatedAt",
          req.query.sortOrder || "desc"
        ),
        req.query
      )
    );
  });

  server.get(`${ROOT}/companies/:companyId`, (req, res) => {
    const company = requireCompany(router.db, res, req.params.companyId);
    if (!company) return;
    const allowedActions = getCompanyActions(company);
    res.json({
      allowedActions,
      data: maskCompany(company, allowedActions),
    });
  });

  server.patch(
    `${ROOT}/companies/:companyId/profile/:section`,
    (req, res) => {
      const company = requireCompany(router.db, res, req.params.companyId);
      if (!company) return;

      const contract = PROFILE_SECTION_CONTRACTS[req.params.section];
      if (!contract) {
        return sendError(
          res,
          404,
          "PROFILE_SECTION_NOT_FOUND",
          "Profile section not found"
        );
      }
      if (!getCompanyActions(company).includes(contract.action)) {
        return sendError(
          res,
          403,
          "ACTION_NOT_ALLOWED",
          "The mock operator cannot edit this company profile section"
        );
      }

      const body = isPlainObject(req.body) ? req.body : {};
      if (!Number.isInteger(body.version) || body.version < 0) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "The profile update is invalid",
          { fieldErrors: { version: ["Expected a non-negative integer"] } }
        );
      }
      if (body.version !== company.version) {
        return sendError(
          res,
          409,
          "VERSION_CONFLICT",
          "The company profile changed after it was loaded",
          { currentVersion: company.version }
        );
      }

      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (contract.requiresReason && !reason) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "A reason is required for billing and payment changes",
          { fieldErrors: { reason: ["Reason is required"] } }
        );
      }
      if (reason.length > 1000) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "The profile update is invalid",
          { fieldErrors: { reason: ["Reason must be 1000 characters or fewer"] } }
        );
      }

      const validation = validateProfileChanges(
        company.profile,
        contract,
        body.changes
      );
      if (validation.fieldErrors) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "The profile update is invalid",
          { fieldErrors: validation.fieldErrors }
        );
      }

      const timestamp = new Date().toISOString();
      const nextCompany = {
        ...clone(company),
        profile: mergeProfileChanges(company.profile, validation.changes),
        version: company.version + 1,
        updatedAt: timestamp,
      };
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const correlationId = `cm-profile-${suffix}`;
      const auditEvent = {
        id: `audit-${suffix}`,
        timestamp,
        actor: {
          id: String(req.get("x-mock-super-admin-id") || "super-admin-local"),
          name: String(req.get("x-mock-super-admin-name") || "Local Super Admin"),
        },
        companyId: company.id,
        actionType: `company.profile.${req.params.section}.updated`,
        entityType: "company",
        entityId: company.id,
        before: redactAuditValue(
          Object.fromEntries(
            Object.keys(validation.changes).map((group) => [
              group,
              company.profile[group],
            ])
          )
        ),
        after: redactAuditValue(validation.changes),
        reason: reason || null,
        result: "success",
        correlationId,
      };

      router.db
        .get("superCompanyManagementCompanies")
        .find({ id: company.id })
        .assign(nextCompany)
        .value();
      router.db
        .get("superCompanyManagementAuditEvents")
        .push(auditEvent)
        .value();
      router.db.write();

      const allowedActions = getCompanyActions(nextCompany);
      return res.json({
        message: "Company profile section updated",
        data: maskCompany(nextCompany, allowedActions),
        auditEvent,
        correlationId,
      });
    }
  );

  server.get(`${ROOT}/permission-catalog`, (req, res) => {
    res.json(
      clone(
        router.db.get("superCompanyManagementPermissionCatalog").value() || []
      )
    );
  });

  server.get(`${ROOT}/tariffs`, (req, res) => {
    res.json(getTariffs(router.db));
  });

  server.get(`${ROOT}/add-ons`, (req, res) => {
    res.json(getAddOns(router.db));
  });

  server.get(`${ROOT}/bundles`, (req, res) => {
    res.json(clone(router.db.get("addOnBundles").value() || []));
  });

  server.get(`${ROOT}/companies/:companyId/users`, (req, res) => {
    const allowed = [
      "keyword",
      "status",
      "userType",
      "employmentType",
      "departmentId",
      "categoryId",
      "roleId",
      "entryFrom",
      "entryTo",
      "page",
      "pageSize",
      "sortBy",
      "sortOrder",
    ];
    const sortable = [
      "onlineId",
      "firstName",
      "lastName",
      "email",
      "status",
      "entryDate",
      "lastActivity",
      "updatedAt",
    ];
    if (!validateQuery(req, res, allowed, sortable)) return;
    if (
      !validateEnumQuery(req, res, "status", [
        "active",
        "paused",
        "notActive",
        "pending",
      ]) ||
      !validateEnumQuery(req, res, "userType", ["companyOwner", "companyUser"]) ||
      !validateEnumQuery(req, res, "employmentType", ["internal", "external"])
    ) {
      return;
    }
    const company = requireCompany(router.db, res, req.params.companyId);
    if (
      !company ||
      !requireViewAction(company, ACTIONS.VIEW_COMPANY_USERS, res)
    ) {
      return;
    }
    let items = (
      router.db.get("superCompanyManagementUsers").value() || []
    ).filter((user) => user.companyId === company.id);
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    if (keyword) {
      items = items.filter((item) =>
        [
          item.firstName,
          item.lastName,
          item.email,
          item.username,
          item.onlineId,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      );
    }
    for (const key of [
      "status",
      "userType",
      "employmentType",
      "departmentId",
      "categoryId",
      "roleId",
    ]) {
      if (req.query[key]) {
        items = items.filter((item) => item[key] === req.query[key]);
      }
    }
    if (req.query.entryFrom) {
      items = items.filter((item) => item.entryDate >= req.query.entryFrom);
    }
    if (req.query.entryTo) {
      items = items.filter((item) => item.entryDate <= req.query.entryTo);
    }
    const permitted = company.permissionProfile !== "restricted";
    items = items.map((user) => ({
      ...clone(user),
      allowedActions: permitted
        ? clone(user.allowedActions)
        : [ACTIONS.VIEW_COMPANY_USERS],
    }));
    res.json(
      paginate(
        stableSort(
          items,
          req.query.sortBy || "lastActivity",
          req.query.sortOrder || "desc"
        ),
        req.query
      )
    );
  });

  server.get(`${ROOT}/companies/:companyId/users/:userId`, (req, res) => {
    const company = requireCompany(router.db, res, req.params.companyId);
    if (
      !company ||
      !requireViewAction(company, ACTIONS.VIEW_COMPANY_USERS, res)
    ) {
      return;
    }
    const user = router.db
      .get("superCompanyManagementUsers")
      .find({ id: req.params.userId, companyId: company.id })
      .value();
    if (!user) {
      return sendError(
        res,
        404,
        "COMPANY_USER_NOT_FOUND",
        "Company user not found"
      );
    }
    const allowedActions =
      company.permissionProfile === "restricted"
        ? [ACTIONS.VIEW_COMPANY_USERS]
        : clone(user.allowedActions);
    res.json({
      allowedActions,
      data: { ...clone(user), allowedActions },
    });
  });

  server.get(`${ROOT}/companies/:companyId/roles`, (req, res) => {
    const company = requireCompany(router.db, res, req.params.companyId);
    if (
      !company ||
      !requireViewAction(company, ACTIONS.VIEW_COMPANY_ROLES, res)
    ) {
      return;
    }
    const roles = (
      router.db.get("superCompanyManagementRoles").value() || []
    )
      .filter((role) => role.companyId === company.id)
      .map((role) => ({
        ...clone(role),
        allowedActions: getRoleActions(company, role),
      }));
    res.json(roles);
  });

  server.get(`${ROOT}/companies/:companyId/roles/:roleId`, (req, res) => {
    const company = requireCompany(router.db, res, req.params.companyId);
    if (
      !company ||
      !requireViewAction(company, ACTIONS.VIEW_COMPANY_ROLES, res)
    ) {
      return;
    }
    const role = router.db
      .get("superCompanyManagementRoles")
      .find({ id: req.params.roleId, companyId: company.id })
      .value();
    if (!role) {
      return sendError(
        res,
        404,
        "COMPANY_ROLE_NOT_FOUND",
        "Company role not found"
      );
    }
    const allowedActions = getRoleActions(company, role);
    res.json({
      allowedActions,
      data: { ...clone(role), allowedActions },
    });
  });

  server.get(`${ROOT}/companies/:companyId/offers`, (req, res) => {
    const company = requireCompany(router.db, res, req.params.companyId);
    if (
      !company ||
      !requireViewAction(company, ACTIONS.VIEW_COMPANY_SUBSCRIPTION, res)
    ) {
      return;
    }
    const packageRecord = router.db
      .get("superCompanyManagementPackages")
      .find({ companyId: company.id })
      .value();
    res.json(clone(packageRecord?.offers || []));
  });

  server.get(`${ROOT}/companies/:companyId/subscription`, (req, res) => {
    const company = requireCompany(router.db, res, req.params.companyId);
    if (
      !company ||
      !requireViewAction(company, ACTIONS.VIEW_COMPANY_SUBSCRIPTION, res)
    ) {
      return;
    }
    const packageRecord = router.db
      .get("superCompanyManagementPackages")
      .find({ companyId: company.id })
      .value();
    if (!packageRecord) {
      return sendError(
        res,
        404,
        "SUBSCRIPTION_NOT_FOUND",
        "Company subscription not found"
      );
    }
    const output = calculatePackageProjection(
      router.db,
      packageRecord,
      getCompanyActions(company)
    );
    output.history = (
      router.db.get("superCompanyManagementPackageHistory").value() || []
    ).filter((entry) => entry.companyId === company.id);
    res.json(output);
  });

  const approvalListHandler = (companyScoped) => (req, res) => {
    const allowed = [
      "keyword",
      "type",
      "status",
      "isSeen",
      "dateFrom",
      "dateTo",
      "page",
      "pageSize",
      "sortBy",
      "sortOrder",
    ];
    const sortable = [
      "id",
      "companyName",
      "type",
      "status",
      "submittedAt",
      "updatedAt",
    ];
    if (!validateQuery(req, res, allowed, sortable)) return;
    if (
      !validateEnumQuery(req, res, "type", ["REGISTRATION", "PROFILE_EDIT"]) ||
      !validateEnumQuery(req, res, "status", [
        "PENDING",
        "APPROVED",
        "ON_CORRECTION",
        "REJECTED",
      ]) ||
      !validateEnumQuery(req, res, "isSeen", ["true", "false"])
    ) {
      return;
    }
    let company = null;
    if (companyScoped) {
      company = requireCompany(router.db, res, req.params.companyId);
      if (
        !company ||
        !requireViewAction(company, ACTIONS.VIEW_COMPANY_APPROVALS, res)
      ) {
        return;
      }
    }
    let items = clone(
      router.db.get("superCompanyManagementApprovals").value() || []
    );
    if (company) {
      items = items.filter((item) => item.companyId === company.id);
    }
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    if (keyword) {
      items = items.filter((item) =>
        [
          item.id,
          item.companyName,
          item.companyOnlineId,
          item.requester?.name,
          item.requester?.email,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      );
    }
    if (req.query.type) {
      items = items.filter((item) => item.type === req.query.type);
    }
    if (req.query.status) {
      items = items.filter((item) => item.status === req.query.status);
    }
    if (req.query.isSeen) {
      items = items.filter(
        (item) => String(item.isSeen) === req.query.isSeen
      );
    }
    if (req.query.dateFrom) {
      items = items.filter((item) => item.submittedAt >= req.query.dateFrom);
    }
    if (req.query.dateTo) {
      items = items.filter((item) => item.submittedAt <= req.query.dateTo);
    }
    items = items.map((item) => {
      const itemCompany = getCompany(router.db, item.companyId);
      return {
        ...item,
        allowedActions: itemCompany
          ? getApprovalActions(itemCompany, item)
          : [],
      };
    });
    items = items.map(
      ({
        registrationSnapshot,
        currentInfo,
        requestedInfo,
        medias,
        history,
        ...item
      }) => item
    );
    res.json(
      paginate(
        sortApprovalQueue(items, req.query),
        req.query
      )
    );
  };

  server.get(`${ROOT}/approvals`, approvalListHandler(false));
  server.get(
    `${ROOT}/companies/:companyId/approvals`,
    approvalListHandler(true)
  );

  server.get(
    `${ROOT}/companies/:companyId/approvals/:approvalId`,
    (req, res) => {
      const company = requireCompany(router.db, res, req.params.companyId);
      if (
        !company ||
        !requireViewAction(company, ACTIONS.VIEW_COMPANY_APPROVALS, res)
      ) {
        return;
      }
      const approval = router.db
        .get("superCompanyManagementApprovals")
        .find({ id: req.params.approvalId, companyId: company.id })
        .value();
      if (!approval) {
        return sendError(
          res,
          404,
          "APPROVAL_NOT_FOUND",
          "Approval not found"
        );
      }
      const allowedActions = getApprovalActions(company, approval);
      res.json({
        allowedActions,
        data: { ...clone(approval), allowedActions },
      });
    }
  );

  server.get(`${ROOT}/companies/:companyId/audit-events`, (req, res) => {
    const allowed = [
      "dateFrom",
      "dateTo",
      "actor",
      "actionType",
      "entityType",
      "keyword",
      "page",
      "pageSize",
      "sortBy",
      "sortOrder",
    ];
    const sortable = [
      "timestamp",
      "actionType",
      "entityType",
      "entityId",
      "result",
    ];
    if (!validateQuery(req, res, allowed, sortable)) return;
    const company = requireCompany(router.db, res, req.params.companyId);
    if (
      !company ||
      !requireViewAction(company, ACTIONS.VIEW_COMPANY_AUDIT_LOG, res)
    ) {
      return;
    }
    let items = clone(
      router.db.get("superCompanyManagementAuditEvents").value() || []
    ).filter((event) => event.companyId === company.id);
    if (req.query.dateFrom) {
      items = items.filter((item) => item.timestamp >= req.query.dateFrom);
    }
    if (req.query.dateTo) {
      items = items.filter((item) => item.timestamp <= req.query.dateTo);
    }
    if (req.query.actor) {
      const actor = String(req.query.actor).toLowerCase();
      items = items.filter((item) =>
        `${item.actor.id} ${item.actor.name}`.toLowerCase().includes(actor)
      );
    }
    if (req.query.actionType) {
      items = items.filter(
        (item) => item.actionType === req.query.actionType
      );
    }
    if (req.query.entityType) {
      items = items.filter(
        (item) => item.entityType === req.query.entityType
      );
    }
    if (req.query.keyword) {
      const keyword = String(req.query.keyword).toLowerCase();
      items = items.filter((item) =>
        `${item.entityId} ${item.reason || ""}`.toLowerCase().includes(keyword)
      );
    }
    res.json(
      paginate(
        stableSort(
          items,
          req.query.sortBy || "timestamp",
          req.query.sortOrder || "desc"
        ),
        req.query
      )
    );
  });

  server.all(/^\/superCompanyManagement/, (req, res) => {
    sendError(
      res,
      404,
      "RAW_COLLECTION_NOT_EXPOSED",
      "Use the Company Management custom API contract"
    );
  });
};
