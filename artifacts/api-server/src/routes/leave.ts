import { and, desc, eq, or, ilike, inArray, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import {
  CreateAbsenceBody,
  CreateAbsenceResponse,
  CreateLeaveRequestBody,
  CreateLeaveRequestResponse,
  GetDashboardSummaryResponse,
  GetEmployeeBalanceParams,
  GetEmployeeBalanceResponse,
  GetEmployeesQueryParams,
  GetEmployeesResponse,
  GetMyEmployeeResponse,
  GetLeaveRequestParams,
  GetLeaveRequestResponse,
  GetLeaveRequestsQueryParams,
  GetLeaveRequestsResponse,
  RegisterMyEmployeeBody,
  RegisterMyEmployeeResponse,
  UpdateLeaveRequestStatusBody,
  UpdateLeaveRequestStatusParams,
  UpdateLeaveRequestStatusResponse,
} from "@workspace/api-zod";
import {
  db,
  employeesTable,
  leaveRequestsTable,
} from "@workspace/db";

const router: IRouter = Router();

type RequestWithEmployee = {
  request: typeof leaveRequestsTable.$inferSelect;
  employee: typeof employeesTable.$inferSelect;
};

function normalizeLeaveType(value: string) {
  if (value === "half_day_am" || value === "half_day_pm") return "half_day";
  if (value === "personal") return "paid_leave";
  return value;
}

function toRequestResponse(row: RequestWithEmployee) {
  return {
    id: row.request.id,
    employeeId: row.request.employeeId,
    employeeName: row.employee.name,
    department: row.employee.department,
    leaveType: normalizeLeaveType(row.request.leaveType),
    timeSlot:
      row.request.timeSlot ??
      (row.request.leaveType === "half_day_am"
        ? "start"
        : row.request.leaveType === "half_day_pm"
          ? "end"
          : null),
    startDate: row.request.startDate,
    endDate: row.request.endDate,
    days: row.request.days,
    reason: row.request.reason,
    status: row.request.status,
    createdAt: row.request.createdAt,
    processedAt: row.request.processedAt,
    rejectionReason: row.request.rejectionReason,
  };
}

function getAnnualAllowance(joinedAt: string) {
  const start = new Date(`${joinedAt}T00:00:00Z`);
  const now = new Date();
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    start.getUTCMonth();
  if (months < 12) return Math.max(1, Math.min(11, months + 1));
  const years = Math.floor(months / 12);
  return 15 + Math.floor((years - 1) / 2);
}

function getEntitlementPeriod(joinedAt: string) {
  const hire = new Date(`${joinedAt}T00:00:00Z`);
  const now = new Date();
  let start = new Date(Date.UTC(now.getUTCFullYear(), hire.getUTCMonth(), hire.getUTCDate()));
  if (start > now) start = new Date(Date.UTC(now.getUTCFullYear() - 1, hire.getUTCMonth(), hire.getUTCDate()));
  const end = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate()));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function calculateRequestDays(leaveType: string, startDate: Date, endDate: Date) {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  if (end < start) return null;
  if (leaveType === "half_day") return start === end ? 0.5 : null;
  if (leaveType === "quarter_day") return start === end ? 0.25 : null;
  if (leaveType === "early_leave" || leaveType === "outing") return start === end ? 0.25 : null;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function deductsAnnualLeave(
  request: typeof leaveRequestsTable.$inferSelect,
  employee: typeof employeesTable.$inferSelect,
) {
  if (
    ["annual", "half_day", "half_day_am", "half_day_pm", "quarter_day"].includes(
      request.leaveType,
    )
  ) {
    return true;
  }
  return (
    request.leaveType === "absence" &&
    getAnnualAllowance(employee.joinedAt) < 15
  );
}

function summarizeEmployee(
  employee: typeof employeesTable.$inferSelect,
  requests: typeof leaveRequestsTable.$inferSelect[],
) {
  const employeeRequests = requests.filter(
    (request) => {
      const period = getEntitlementPeriod(employee.joinedAt);
      return (
        request.employeeId === employee.id &&
        request.startDate >= period.start &&
        request.startDate < period.end
      );
    },
  );
  const annualAllowance = getAnnualAllowance(employee.joinedAt);
  const usedDays = employeeRequests
    .filter(
      (request) =>
        request.status === "approved" && deductsAnnualLeave(request, employee),
    )
    .reduce((sum, request) => sum + request.days, 0);
  const pendingDays = employeeRequests
    .filter(
      (request) =>
        request.status === "pending" && deductsAnnualLeave(request, employee),
    )
    .reduce((sum, request) => sum + request.days, 0);

  return {
    id: employee.id,
    name: employee.name,
    department: employee.department,
    role: employee.role,
    joinedAt: employee.joinedAt,
    annualAllowance,
    usedDays,
    pendingDays,
    remainingDays: Math.max(0, annualAllowance - usedDays - pendingDays),
    companyName: employee.companyName,
    email: employee.email,
    employeeNumber: employee.employeeNumber,
    position: employee.position,
    status: employee.status,
    resignedAt: employee.resignedAt,
    ordinaryHourlyWage: employee.ordinaryHourlyWage,
  };
}

async function getJoinedRequests(): Promise<RequestWithEmployee[]> {
  return db
    .select({ request: leaveRequestsTable, employee: employeesTable })
    .from(leaveRequestsTable)
    .innerJoin(
      employeesTable,
      eq(leaveRequestsTable.employeeId, employeesTable.id),
    )
    .orderBy(desc(leaveRequestsTable.createdAt));
}

async function getJoinedRequest(id: number): Promise<RequestWithEmployee | null> {
  const [row] = await db
    .select({ request: leaveRequestsTable, employee: employeesTable })
    .from(leaveRequestsTable)
    .innerJoin(
      employeesTable,
      eq(leaveRequestsTable.employeeId, employeesTable.id),
    )
    .where(eq(leaveRequestsTable.id, id));

  return row ?? null;
}

router.use(async (req, res, next): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }
  const [actor] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.clerkUserId, userId));
  if (
    actor?.status === "resigned" ||
    (!actor && !(req.method === "POST" && req.path === "/me/employee"))
  ) {
    res.status(403).json({ error: "직원 프로필 등록이 필요합니다." });
    return;
  }
  res.locals.actor = actor ?? null;
  next();
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (actor.role !== "관리자") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return;
  }
  const [allEmployees, allRequests] = await Promise.all([
    db.select().from(employeesTable),
    db.select().from(leaveRequestsTable),
  ]);
  const employees = allEmployees.filter(
    (employee) => employee.companyName === actor.companyName,
  );
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const requests = allRequests.filter((request) => employeeIds.has(request.employeeId));
  const employeeSummaries = employees.map((employee) =>
    summarizeEmployee(employee, requests),
  );
  const approvedRequests = requests.filter(
    (request) => request.status === "approved",
  );
  const pendingRequests = requests.filter(
    (request) => request.status === "pending",
  );
  const year = new Date().getFullYear();
  const monthlyUsage = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      month: `${month}월`,
      days: approvedRequests
        .filter((request) => {
          const employee = employees.find((item) => item.id === request.employeeId);
          if (!employee || !deductsAnnualLeave(request, employee)) return false;
          const requestYear = Number(request.startDate.slice(0, 4));
          const requestMonth = Number(request.startDate.slice(5, 7));
          return requestYear === year && requestMonth === month;
        })
        .reduce((sum, request) => sum + request.days, 0),
    };
  });
  const today = new Date().toISOString().slice(0, 10);
  const upcomingLeaves = (await getJoinedRequests()).filter(({ employee }) =>
    employeeIds.has(employee.id),
  );

  const response = {
    year,
    annualAllowance: employeeSummaries.reduce(
      (sum, employee) => sum + employee.annualAllowance,
      0,
    ),
    usedDays: employeeSummaries.reduce(
      (sum, employee) => sum + employee.usedDays,
      0,
    ),
    remainingDays: employeeSummaries.reduce(
      (sum, employee) => sum + employee.remainingDays,
      0,
    ),
    pendingDays: employeeSummaries.reduce(
      (sum, employee) => sum + employee.pendingDays,
      0,
    ),
    employeeCount: employees.length,
    pendingRequestCount: pendingRequests.length,
    approvedRequestCount: approvedRequests.length,
    upcomingLeaves: upcomingLeaves
      .filter(
        ({ request }) =>
          request.status === "approved" && request.startDate >= today,
      )
      .sort((a, b) => a.request.startDate.localeCompare(b.request.startDate))
      .slice(0, 5)
      .map(({ request, employee }) => ({
        id: request.id,
        employeeName: employee.name,
        leaveType: normalizeLeaveType(request.leaveType),
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.days,
      })),
    monthlyUsage,
  };

  res.json(GetDashboardSummaryResponse.parse(response));
});

router.get("/me/employee", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.clerkUserId, userId));
  if (!employee) {
    res.status(404).json({ error: "직원 프로필이 등록되지 않았습니다." });
    return;
  }
  const requests = await db
    .select()
    .from(leaveRequestsTable)
    .where(eq(leaveRequestsTable.employeeId, employee.id));
  res.json(GetMyEmployeeResponse.parse(summarizeEmployee(employee, requests)));
});

router.post("/me/employee", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }
  const parsedBody = RegisterMyEmployeeBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.clerkUserId, userId));
  if (existing) {
    const requests = await db
      .select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.employeeId, existing.id));
    res.json(
      RegisterMyEmployeeResponse.parse(summarizeEmployee(existing, requests)),
    );
    return;
  }

  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail = clerkUser.primaryEmailAddress;
  const verifiedEmail =
    primaryEmail?.verification?.status === "verified"
      ? primaryEmail.emailAddress
      : null;
  if (!verifiedEmail) {
    res.status(400).json({ error: "인증된 이메일을 확인할 수 없습니다." });
    return;
  }
  const matches = await db
    .select()
    .from(employeesTable)
    .where(sql`lower(${employeesTable.email}) = ${verifiedEmail.toLowerCase()}`);
  if (matches.length > 1) {
    res.status(409).json({ error: "중복된 직원 이메일입니다. 인사 담당자에게 문의해 주세요." });
    return;
  }
  const [preProvisioned] = matches;
  if (preProvisioned?.status === "active") {
    if (preProvisioned.clerkUserId && preProvisioned.clerkUserId !== userId) {
      res.status(409).json({ error: "이미 다른 계정에 연결된 직원입니다." });
      return;
    }
    const [linked] = await db
      .update(employeesTable)
      .set({ clerkUserId: userId })
      .where(eq(employeesTable.id, preProvisioned.id))
      .returning();
    const requests = await db
      .select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.employeeId, linked.id));
    res.status(201).json(
      RegisterMyEmployeeResponse.parse(summarizeEmployee(linked, requests)),
    );
    return;
  }
  res.status(403).json({
    error: "관리자가 사전 등록한 이메일과 일치하지 않습니다. 인사 담당자에게 문의해 주세요.",
  });
});

router.get("/employees", async (req, res): Promise<void> => {
  const parsedQuery = GetEmployeesQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (actor.role !== "관리자") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return;
  }
  const employees = await db
    .select()
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.companyName, actor.companyName ?? ""),
        parsedQuery.data.search
          ? or(
              ilike(employeesTable.name, `%${parsedQuery.data.search}%`),
              ilike(employeesTable.department, `%${parsedQuery.data.search}%`),
              ilike(employeesTable.role, `%${parsedQuery.data.search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(employeesTable.name);
  const requests =
    employees.length === 0
      ? []
      : await db
          .select()
          .from(leaveRequestsTable)
          .where(
            inArray(
              leaveRequestsTable.employeeId,
              employees.map((employee) => employee.id),
            ),
          );
  res.json(
    GetEmployeesResponse.parse(
      employees.map((employee) => summarizeEmployee(employee, requests)),
    ),
  );
});

router.get("/employees/:id/balance", async (req, res): Promise<void> => {
  const parsedParams = GetEmployeeBalanceParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, parsedParams.data.id));
  if (!employee) {
    res.status(404).json({ error: "직원을 찾을 수 없습니다." });
    return;
  }
  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (
    employee.companyName !== actor.companyName ||
    (actor.role !== "관리자" && employee.id !== actor.id)
  ) {
    res.status(403).json({ error: "조회 권한이 없습니다." });
    return;
  }

  const requests = await db
    .select()
    .from(leaveRequestsTable)
    .where(eq(leaveRequestsTable.employeeId, employee.id));
  const summary = summarizeEmployee(employee, requests);
  res.json(
    GetEmployeeBalanceResponse.parse({
      employeeId: summary.id,
      annualAllowance: summary.annualAllowance,
      usedDays: summary.usedDays,
      pendingDays: summary.pendingDays,
      remainingDays: summary.remainingDays,
    }),
  );
});

router.get("/leave-requests", async (req, res): Promise<void> => {
  const parsedQuery = GetLeaveRequestsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const rows = await getJoinedRequests();
  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (
    actor.role !== "관리자" &&
    parsedQuery.data.employeeId &&
    parsedQuery.data.employeeId !== actor.id
  ) {
    res.status(403).json({ error: "다른 직원의 신청 내역을 조회할 수 없습니다." });
    return;
  }
  const search = parsedQuery.data.search?.toLowerCase();
  const filtered = rows.filter(({ request, employee }) => {
    if (employee.companyName !== actor.companyName) return false;
    if (actor.role !== "관리자" && employee.id !== actor.id) return false;
    const matchesStatus =
      !parsedQuery.data.status || request.status === parsedQuery.data.status;
    const matchesSearch =
      !search ||
      [employee.name, employee.department, request.reason]
        .join(" ")
        .toLowerCase()
        .includes(search);
    const matchesEmployee =
      !parsedQuery.data.employeeId ||
      employee.id === parsedQuery.data.employeeId;
    const matchesYear =
      !parsedQuery.data.year ||
      Number(request.startDate.slice(0, 4)) === parsedQuery.data.year;
    const matchesMonth =
      !parsedQuery.data.month ||
      Number(request.startDate.slice(5, 7)) === parsedQuery.data.month;
    return (
      matchesStatus &&
      matchesSearch &&
      matchesEmployee &&
      matchesYear &&
      matchesMonth
    );
  });

  res.json(GetLeaveRequestsResponse.parse(filtered.map(toRequestResponse)));
});

router.post("/leave-requests", async (req, res): Promise<void> => {
  const parsedBody = CreateLeaveRequestBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (
    actor.role !== "관리자" &&
    parsedBody.data.employeeId !== actor.id
  ) {
    res.status(403).json({ error: "본인의 휴가만 신청할 수 있습니다." });
    return;
  }
  const targetEmployeeId =
    actor.role === "관리자" ? parsedBody.data.employeeId : actor.id;
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, targetEmployeeId));
  if (!employee) {
    res.status(400).json({ error: "직원을 찾을 수 없습니다." });
    return;
  }
  if (
    employee.companyName !== actor.companyName ||
    (actor.role !== "관리자" && employee.id !== actor.id)
  ) {
    res.status(403).json({ error: "신청 권한이 없습니다." });
    return;
  }
  const calculatedDays = calculateRequestDays(
    parsedBody.data.leaveType,
    parsedBody.data.startDate,
    parsedBody.data.endDate,
  );
  if (calculatedDays === null || calculatedDays !== parsedBody.data.days) {
    res.status(400).json({ error: "휴가 종류와 기간에 맞지 않는 사용 일수입니다." });
    return;
  }
  const balance = summarizeEmployee(
    employee,
    await db
      .select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.employeeId, employee.id)),
  );
  if (
    ["annual", "half_day", "quarter_day"].includes(parsedBody.data.leaveType) &&
    parsedBody.data.days > balance.remainingDays
  ) {
    res.status(400).json({ error: "잔여 연차가 부족합니다." });
    return;
  }
  if (
    ["half_day", "quarter_day"].includes(parsedBody.data.leaveType) &&
    !parsedBody.data.timeSlot
  ) {
    res.status(400).json({ error: "반차·반반차는 출근 또는 퇴근 연결을 선택해 주세요." });
    return;
  }

  const [created] = await db
    .insert(leaveRequestsTable)
    .values({
      employeeId: employee.id,
      leaveType: parsedBody.data.leaveType,
      timeSlot: parsedBody.data.timeSlot ?? null,
      startDate: parsedBody.data.startDate.toISOString().slice(0, 10),
      endDate: parsedBody.data.endDate.toISOString().slice(0, 10),
      days: calculatedDays,
      reason: parsedBody.data.reason,
      status: "pending",
    })
    .returning();

  const response = toRequestResponse({ request: created, employee });
  res.status(201).json(CreateLeaveRequestResponse.parse(response));
});

router.post("/attendance/absences", async (req, res): Promise<void> => {
  const parsedBody = CreateAbsenceBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, parsedBody.data.employeeId));
  if (!employee) {
    res.status(400).json({ error: "직원을 찾을 수 없습니다." });
    return;
  }
  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (
    actor.role !== "관리자" ||
    employee.companyName !== actor.companyName
  ) {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return;
  }
  const calculatedDays = calculateRequestDays(
    "absence",
    parsedBody.data.startDate,
    parsedBody.data.endDate,
  );
  if (calculatedDays === null || calculatedDays !== parsedBody.data.days) {
    res.status(400).json({ error: "부재 기간과 일수가 일치하지 않습니다." });
    return;
  }
  if (getAnnualAllowance(employee.joinedAt) < 15) {
    const requests = await db
      .select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.employeeId, employee.id));
    const balance = summarizeEmployee(employee, requests);
    if (calculatedDays > balance.remainingDays) {
      res.status(400).json({ error: "차감할 잔여 연차가 부족합니다." });
      return;
    }
  }

  const [created] = await db
    .insert(leaveRequestsTable)
    .values({
      employeeId: employee.id,
      leaveType: "absence",
      startDate: parsedBody.data.startDate.toISOString().slice(0, 10),
      endDate: parsedBody.data.endDate.toISOString().slice(0, 10),
      days: calculatedDays,
      reason: parsedBody.data.reason,
      status: "approved",
      processedAt: new Date(),
    })
    .returning();

  res.status(201).json(
    CreateAbsenceResponse.parse(
      toRequestResponse({ request: created, employee }),
    ),
  );
});

router.get("/leave-requests/:id", async (req, res): Promise<void> => {
  const parsedParams = GetLeaveRequestParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  const row = await getJoinedRequest(parsedParams.data.id);
  if (!row) {
    res.status(404).json({ error: "연차 신청을 찾을 수 없습니다." });
    return;
  }
  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (
    row.employee.companyName !== actor.companyName ||
    (actor.role !== "관리자" && row.employee.id !== actor.id)
  ) {
    res.status(403).json({ error: "조회 권한이 없습니다." });
    return;
  }

  res.json(GetLeaveRequestResponse.parse(toRequestResponse(row)));
});

router.patch("/leave-requests/:id/status", async (req, res): Promise<void> => {
  const parsedParams = UpdateLeaveRequestStatusParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }
  const parsedBody = UpdateLeaveRequestStatusBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }
  const actor = res.locals.actor as typeof employeesTable.$inferSelect;
  if (actor.role !== "관리자") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return;
  }
  const existing = await getJoinedRequest(parsedParams.data.id);
  if (!existing || existing.employee.companyName !== actor.companyName) {
    res.status(404).json({ error: "연차 신청을 찾을 수 없습니다." });
    return;
  }

  const [updated] = await db
    .update(leaveRequestsTable)
    .set({
      status: parsedBody.data.status,
      processedAt:
        parsedBody.data.status === "pending" ? null : new Date(),
      rejectionReason:
        parsedBody.data.status === "rejected"
          ? parsedBody.data.rejectionReason ?? null
          : null,
    })
    .where(eq(leaveRequestsTable.id, parsedParams.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "연차 신청을 찾을 수 없습니다." });
    return;
  }

  const row = await getJoinedRequest(updated.id);
  if (!row) {
    res.status(404).json({ error: "연차 신청을 찾을 수 없습니다." });
    return;
  }
  res.json(UpdateLeaveRequestStatusResponse.parse(toRequestResponse(row)));
});

export default router;