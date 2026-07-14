const registerCompanyApprovalRoutes = (server, router) => {
  server.patch("/super-company-approvals/seen/:id", (req, res) => {
    const approvals = router.db.get("companyApproval").get("items");
    const approval = approvals.find({ id: req.params.id }).value();

    if (!approval) {
      return res.status(404).json({ message: "Company approval not found" });
    }

    approvals.find({ id: req.params.id }).assign({ isSeen: true }).write();

    return res.json({ ...approval, isSeen: true });
  });

  server.get("/super-company-approvals/:id", (req, res) => {
    const approval = router.db
      .get("companyApproval")
      .get("items")
      .find({ id: req.params.id })
      .value();
    const detailMock = router.db.get("companyApprovalDetailMock").value();

    if (!approval || !detailMock) {
      return res.status(404).json({ message: "Company approval not found" });
    }

    const fullRegistrationStatus =
      approval.status === "APPROVED"
        ? "approved"
        : approval.status === "REJECTED"
          ? "rejected"
          : "pending";
    const actions =
      approval.status === "PENDING"
        ? []
        : [
            {
              id: `action-${approval.id}`,
              appliedById: "admin-001",
              appliedByName: "Super Admin",
              date: approval.updated,
              status: approval.status,
              message: `Mock ${approval.status.toLowerCase().replace("_", " ")} decision.`,
            },
          ];

    return res.json({
      ...approval,
      registration: {
        ...detailMock.registration,
        id: `registration-${approval.id}`,
        header: {
          ...detailMock.registration.header,
          date: approval.created,
          fullRegistrationStatus,
        },
        info: {
          ...detailMock.registration.info,
          addressData: {
            ...detailMock.registration.info.addressData,
            companyName: approval.companyName,
            email: approval.ownerEmail,
          },
          legalPerson: {
            ...detailMock.registration.info.legalPerson,
            firstName: approval.ownerName.split(" ")[0] || "",
            lastName: approval.ownerName.split(" ").slice(1).join(" "),
          },
          administrator: {
            ...detailMock.registration.info.administrator,
            firstName: approval.ownerName.split(" ")[0] || "",
            lastName: approval.ownerName.split(" ").slice(1).join(" "),
            email: approval.ownerEmail,
          },
        },
      },
      medias: detailMock.medias,
      actions,
    });
  });
};

module.exports = registerCompanyApprovalRoutes;
