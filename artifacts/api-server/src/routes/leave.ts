import { desc, eq, or, ilike } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateLeaveRequestBody,
  CreateLeaveRequestResponse,
  GetDashboardSummaryResponse,
  GetEmployeeBalanceParams,
  GetEmployeeBalanceResponse,
  GetEmployeesQueryParams,
  GetEmployeesResponse,
  GetLeaveRequestParams,
  GetLeaveRequestResponse,
  GetLeaveRequestsQueryParams,
  GetLeaveRequestsResponse,
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

function toRequestResponse(row: RequestWithEmployee) {
  return {
    id: row.request.id,
    employeeId: row.request.employeeId,
    employeeName: row.employee.name,
    department: row.employee.department,
    leaveType: row.request.leaveType,
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

function summarizeEmployee(
  employee: typeof employeesTable.$inferSelect,
  requests: typeof leaveRequestsTable.$inferSelect[],
) {
  const employeeRequests = requests.filter(
    (request) => request.employeeId === employee.id,
  );
  const usedDays = employeeRequests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + request.days, 0);
  const pendingDays = employeeRequests
    .filter((request) => request.status === "pending")
    .reduce((sum, request) => sum + request.days, 0);

  return {
    id: employee.id,
    name: employee.name,
    department: employee.department,
    role: employee.role,
    joinedAt: employee.joinedAt,
    annualAllowance: employee.annualAllowance,
    usedDays,
    pendingDays,
    remainingDays: Math.max(0, employee.annualAllowance - usedDays - pendingDays),
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

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [employees, requests] = await Promise.all([
    db.select().from(employeesTable),
    db.select().from(leaveRequestsTable),
  ]);
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
          const requestYear = Number(request.startDate.slice(0, 4));
          const requestMonth = Number(request.startDate.slice(5, 7));
          return requestYear === year && requestMonth === month;
        })
        .reduce((sum, request) => sum + request.days, 0),
    };
  });
  const today = new Date().toISOString().slice(0, 10);
  const upcomingLeaves = await getJoinedRequests();

  const response = {
    year,
    annualAllowance: employeeSummaries.reduce(
      (sum, employee) => sum + employee.annualAllowance,
      0,
    ),
    usedDays: approvedRequests.reduce((sum, request) => sum + request.days, 0),
    remainingDays: employeeSummaries.reduce(
      (sum, employee) => sum + employee.remainingDays,
      0,
    ),
    pendingDays: pendingRequests.reduce((sum, request) => sum + request.days, 0),
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
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.days,
      })),
    monthlyUsage,
  };

  res.json(GetDashboardSummaryResponse.parse(response));
});

router.get("/employees", async (req, res): Promise<void> => {
  const parsedQuery = GetEmployeesQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const [employees, requests] = await Promise.all([
    db
      .select()
      .from(employeesTable)
      .where(
        parsedQuery.data.search
          ? or(
              ilike(employeesTable.name, `%${parsedQuery.data.search}%`),
              ilike(employeesTable.department, `%${parsedQuery.data.search}%`),
              ilike(employeesTable.role, `%${parsedQuery.data.search}%`),
            )
          : undefined,
      )
      .orderBy(employeesTable.name),
    db.select().from(leaveRequestsTable),
  ]);

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
  const search = parsedQuery.data.search?.toLowerCase();
  const filtered = rows.filter(({ request, employee }) => {
    const matchesStatus =
      !parsedQuery.data.status || request.status === parsedQuery.data.status;
    const matchesSearch =
      !search ||
      [employee.name, employee.department, request.reason]
        .join(" ")
        .toLowerCase()
        .includes(search);
    return matchesStatus && matchesSearch;
  });

  res.json(GetLeaveRequestsResponse.parse(filtered.map(toRequestResponse)));
});

router.post("/leave-requests", async (req, res): Promise<void> => {
  const parsedBody = CreateLeaveRequestBody.safeParse(req.body);
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

  const [created] = await db
    .insert(leaveRequestsTable)
    .values({
      employeeId: employee.id,
      leaveType: parsedBody.data.leaveType,
      startDate: parsedBody.data.startDate.toISOString().slice(0, 10),
      endDate: parsedBody.data.endDate.toISOString().slice(0, 10),
      days: parsedBody.data.days,
      reason: parsedBody.data.reason,
      status: "pending",
    })
    .returning();

  const response = toRequestResponse({ request: created, employee });
  res.status(201).json(CreateLeaveRequestResponse.parse(response));
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