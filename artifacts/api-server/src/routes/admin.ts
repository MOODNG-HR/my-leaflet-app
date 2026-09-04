import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
  CreateAdminEmployeeBody,
  CreateAdminEmployeeResponse,
  GetAdminEmployeeParams,
  GetAdminEmployeeResponse,
  GetAdminEmployeesQueryParams,
  GetAdminEmployeesResponse,
  ResignAdminEmployeeBody,
  ResignAdminEmployeeParams,
  ResignAdminEmployeeResponse,
  UpdateAdminEmployeeBody,
  UpdateAdminEmployeeParams,
  UpdateAdminEmployeeResponse,
} from "@workspace/api-zod";
import { db, employeesTable, leaveRequestsTable } from "@workspace/db";

const router: IRouter = Router();

type Employee = typeof employeesTable.$inferSelect;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function annualAllowance(joinedAt: string) {
  const start = new Date(`${joinedAt}T00:00:00Z`);
  const now = new Date();
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    start.getUTCMonth();
  if (months < 12) return Math.max(1, Math.min(11, months + 1));
  const years = Math.floor(months / 12);
  return Math.min(25, 15 + Math.floor((years - 1) / 2));
}

async function toResponse(employee: Employee) {
  const requests = await db
    .select()
    .from(leaveRequestsTable)
    .where(eq(leaveRequestsTable.employeeId, employee.id));
  const allowance = annualAllowance(employee.joinedAt);
  const relevant = requests.filter((request) =>
    ["annual", "half_day", "half_day_am", "half_day_pm", "quarter_day"].includes(
      request.leaveType,
    ),
  );
  const usedDays = relevant
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + request.days, 0);
  const pendingDays = relevant
    .filter((request) => request.status === "pending")
    .reduce((sum, request) => sum + request.days, 0);
  return {
    id: employee.id,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    role: employee.role,
    joinedAt: employee.joinedAt,
    status: employee.status,
    resignedAt: employee.resignedAt,
    ordinaryHourlyWage: employee.ordinaryHourlyWage,
    annualAllowance: allowance,
    usedDays,
    pendingDays,
    remainingDays: Math.max(0, allowance - usedDays - pendingDays),
    companyName: employee.companyName,
    email: employee.email,
    employeeNumber: employee.employeeNumber,
  };
}

router.use("/admin", async (req, res, next): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }
  const [actor] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.clerkUserId, userId));
  if (!actor || actor.status !== "active" || actor.role !== "관리자") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return;
  }
  res.locals.actor = actor;
  next();
});

router.get("/admin/employees", async (req, res): Promise<void> => {
  const query = GetAdminEmployeesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const actor = res.locals.actor as Employee;
  const search = query.data.search?.trim();
  const rows = await db
    .select()
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.companyName, actor.companyName ?? ""),
        search
          ? or(
              ilike(employeesTable.name, `%${search}%`),
              ilike(employeesTable.email, `%${search}%`),
              ilike(employeesTable.employeeNumber, `%${search}%`),
              ilike(employeesTable.department, `%${search}%`),
            )
          : undefined,
      ),
    );
  res.json(GetAdminEmployeesResponse.parse(await Promise.all(rows.map(toResponse))));
});

router.post("/admin/employees", async (req, res): Promise<void> => {
  const body = CreateAdminEmployeeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const actor = res.locals.actor as Employee;
  const email = normalizeEmail(body.data.email);
  const duplicates = await db
    .select()
    .from(employeesTable)
    .where(
      or(
        sql`lower(${employeesTable.email}) = ${email}`,
        and(
          eq(employeesTable.companyName, actor.companyName ?? ""),
          eq(employeesTable.employeeNumber, body.data.employeeNumber.trim()),
        ),
      ),
    );
  if (
    duplicates.some(
      (employee) =>
        normalizeEmail(employee.email ?? "") === email ||
        employee.employeeNumber === body.data.employeeNumber.trim(),
    )
  ) {
    res.status(409).json({ error: "이메일 또는 사번이 이미 등록되어 있습니다." });
    return;
  }
  const [created] = await db
    .insert(employeesTable)
    .values({
      companyName: actor.companyName,
      employeeNumber: body.data.employeeNumber.trim(),
      name: body.data.name.trim(),
      email,
      department: body.data.department.trim(),
      position: body.data.position.trim(),
      role: body.data.role,
      joinedAt: body.data.joinedAt.toISOString().slice(0, 10),
      status: "active",
      ordinaryHourlyWage: body.data.ordinaryHourlyWage,
      annualAllowance: annualAllowance(body.data.joinedAt.toISOString().slice(0, 10)),
    })
    .returning();
  res.status(201).json(CreateAdminEmployeeResponse.parse(await toResponse(created)));
});

router.get("/admin/employees/:id", async (req, res): Promise<void> => {
  const params = GetAdminEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const actor = res.locals.actor as Employee;
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.id, params.data.id),
        eq(employeesTable.companyName, actor.companyName ?? ""),
      ),
    );
  if (!employee) {
    res.status(404).json({ error: "직원을 찾을 수 없습니다." });
    return;
  }
  res.json(GetAdminEmployeeResponse.parse(await toResponse(employee)));
});

router.patch("/admin/employees/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminEmployeeParams.safeParse(req.params);
  const body = UpdateAdminEmployeeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "입력값을 확인해 주세요." });
    return;
  }
  const actor = res.locals.actor as Employee;
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.id, params.data.id),
        eq(employeesTable.companyName, actor.companyName ?? ""),
      ),
    );
  if (!employee) {
    res.status(404).json({ error: "직원을 찾을 수 없습니다." });
    return;
  }
  if (employee.clerkUserId && body.data.email && normalizeEmail(body.data.email) !== employee.email) {
    res.status(409).json({ error: "활성화된 계정의 이메일은 변경할 수 없습니다." });
    return;
  }
  if (body.data.email || body.data.employeeNumber) {
    const duplicates = await db
      .select()
      .from(employeesTable)
      .where(
        and(
          ne(employeesTable.id, employee.id),
          or(
            body.data.email
              ? sql`lower(${employeesTable.email}) = ${normalizeEmail(body.data.email)}`
              : undefined,
            body.data.employeeNumber
              ? and(
                  eq(employeesTable.companyName, actor.companyName ?? ""),
                  eq(employeesTable.employeeNumber, body.data.employeeNumber.trim()),
                )
              : undefined,
          ),
        ),
      );
    if (duplicates.length > 0) {
      res.status(409).json({ error: "이메일 또는 사번이 이미 등록되어 있습니다." });
      return;
    }
  }
  if (employee.role === "관리자" && body.data.role === "직원") {
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${actor.companyName ?? ""}))`);
      const admins = await tx
        .select()
        .from(employeesTable)
        .where(
          and(
            eq(employeesTable.companyName, actor.companyName ?? ""),
            eq(employeesTable.role, "관리자"),
            eq(employeesTable.status, "active"),
          ),
        );
      if (admins.length <= 1) return null;
      const [row] = await tx
        .update(employeesTable)
        .set({
          employeeNumber: body.data.employeeNumber?.trim(),
          name: body.data.name?.trim(),
          email: body.data.email ? normalizeEmail(body.data.email) : undefined,
          department: body.data.department?.trim(),
          position: body.data.position?.trim(),
          role: body.data.role,
          joinedAt: body.data.joinedAt?.toISOString().slice(0, 10),
          ordinaryHourlyWage: body.data.ordinaryHourlyWage,
        })
        .where(eq(employeesTable.id, employee.id))
        .returning();
      return row;
    });
    if (!updated) {
      res.status(409).json({ error: "최소 한 명의 활성 관리자가 필요합니다." });
      return;
    }
    res.json(UpdateAdminEmployeeResponse.parse(await toResponse(updated)));
    return;
  }
  const [updated] = await db
    .update(employeesTable)
    .set({
      employeeNumber: body.data.employeeNumber?.trim(),
      name: body.data.name?.trim(),
      email: body.data.email ? normalizeEmail(body.data.email) : undefined,
      department: body.data.department?.trim(),
      position: body.data.position?.trim(),
      role: body.data.role,
      joinedAt: body.data.joinedAt?.toISOString().slice(0, 10),
      ordinaryHourlyWage: body.data.ordinaryHourlyWage,
    })
    .where(eq(employeesTable.id, employee.id))
    .returning();
  res.json(UpdateAdminEmployeeResponse.parse(await toResponse(updated)));
});

router.post("/admin/employees/:id/resign", async (req, res): Promise<void> => {
  const params = ResignAdminEmployeeParams.safeParse(req.params);
  const body = ResignAdminEmployeeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "퇴사일을 확인해 주세요." });
    return;
  }
  const actor = res.locals.actor as Employee;
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.id, params.data.id),
        eq(employeesTable.companyName, actor.companyName ?? ""),
      ),
    );
  if (!employee) {
    res.status(404).json({ error: "직원을 찾을 수 없습니다." });
    return;
  }
  if (employee.id === actor.id) {
    res.status(409).json({ error: "현재 로그인한 관리자 본인은 퇴사 처리할 수 없습니다." });
    return;
  }
  const updated = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${actor.companyName ?? ""}))`);
    if (employee.role === "관리자") {
      const admins = await tx
        .select()
        .from(employeesTable)
        .where(
          and(
            eq(employeesTable.companyName, actor.companyName ?? ""),
            eq(employeesTable.role, "관리자"),
            eq(employeesTable.status, "active"),
          ),
        );
      if (admins.length <= 1) return null;
    }
    const [row] = await tx
      .update(employeesTable)
      .set({
        status: "resigned",
        resignedAt: body.data.resignedAt.toISOString().slice(0, 10),
        clerkUserId: null,
      })
      .where(eq(employeesTable.id, employee.id))
      .returning();
    return row;
  });
  if (!updated) {
    res.status(409).json({ error: "최소 한 명의 활성 관리자가 필요합니다." });
    return;
  }
  res.json(ResignAdminEmployeeResponse.parse(await toResponse(updated)));
});

export default router;