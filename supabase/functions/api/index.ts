// 무등기업 HR Management System – Supabase Edge Function
// 이 함수는 기존 Express.js API 서버를 완전히 대체합니다.
//
// 환경 변수 (supabase secrets set 으로 설정):
//   CLERK_JWKS_URL   = https://<your-clerk-domain>/.well-known/jwks.json
//   SUPABASE_URL     = https://<your-project-ref>.supabase.co  (자동 주입)
//   SUPABASE_SERVICE_ROLE_KEY                                   (자동 주입)

import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "npm:jose@5";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type Employee = {
  id: number;
  clerk_user_id: string | null;
  company_name: string | null;
  email: string | null;
  employee_number: string | null;
  name: string;
  department: string;
  position: string;
  role: string;
  joined_at: string;
  status: string;
  resigned_at: string | null;
  ordinary_hourly_wage: number;
  annual_allowance: number;
};

type LeaveRequest = {
  id: number;
  employee_id: number;
  registered_by_employee_id: number | null;
  record_source: string;
  leave_type: string;
  time_slot: string | null;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
};

// ──────────────────────────────────────────────
// CORS
// ──────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ──────────────────────────────────────────────
// Supabase client (service role – bypasses RLS)
// ──────────────────────────────────────────────

function db() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ──────────────────────────────────────────────
// Clerk JWT verification
// ──────────────────────────────────────────────

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!_jwks) {
    const url = Deno.env.get("CLERK_JWKS_URL");
    if (!url) throw new Error("CLERK_JWKS_URL 환경 변수가 설정되지 않았습니다.");
    _jwks = createRemoteJWKSet(new URL(url));
  }
  return _jwks;
}

async function verifyClerkJWT(
  authHeader: string | null,
): Promise<JWTPayload & { sub: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("로그인이 필요합니다."), { status: 401 });
  }
  const token = authHeader.slice(7);
  const { payload } = await jwtVerify(token, getJwks()).catch(() => {
    throw Object.assign(new Error("유효하지 않은 인증 토큰입니다."), {
      status: 401,
    });
  });
  if (!payload.sub) {
    throw Object.assign(new Error("로그인이 필요합니다."), { status: 401 });
  }
  return payload as JWTPayload & { sub: string };
}

// ──────────────────────────────────────────────
// Business logic (ported from Express routes)
// ──────────────────────────────────────────────

function getAnnualAllowance(joinedAt: string): number {
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

function getEntitlementPeriod(joinedAt: string): {
  start: string;
  end: string;
} {
  const hire = new Date(`${joinedAt}T00:00:00Z`);
  const now = new Date();
  let start = new Date(
    Date.UTC(now.getUTCFullYear(), hire.getUTCMonth(), hire.getUTCDate()),
  );
  if (start > now)
    start = new Date(
      Date.UTC(
        now.getUTCFullYear() - 1,
        hire.getUTCMonth(),
        hire.getUTCDate(),
      ),
    );
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear() + 1,
      start.getUTCMonth(),
      start.getUTCDate(),
    ),
  );
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function calculateRequestDays(
  leaveType: string,
  startDate: Date,
  endDate: Date,
): number | null {
  const start = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const end = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  );
  if (end < start) return null;
  if (leaveType === "half_day") return start === end ? 0.5 : null;
  if (leaveType === "quarter_day") return start === end ? 0.25 : null;
  if (leaveType === "early_leave" || leaveType === "outing")
    return start === end ? 0.25 : null;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function deductsAnnualLeave(
  leaveType: string,
  joinedAt: string,
): boolean {
  if (
    ["annual", "half_day", "half_day_am", "half_day_pm", "quarter_day"].includes(
      leaveType,
    )
  )
    return true;
  return leaveType === "absence" && getAnnualAllowance(joinedAt) < 15;
}

function normalizeLeaveType(value: string): string {
  if (value === "half_day_am" || value === "half_day_pm") return "half_day";
  if (value === "personal") return "paid_leave";
  return value;
}

function summarizeEmployee(
  employee: Employee,
  requests: LeaveRequest[],
): Record<string, unknown> {
  const period = getEntitlementPeriod(employee.joined_at);
  const relevant = requests.filter(
    (r) =>
      r.employee_id === employee.id &&
      r.start_date >= period.start &&
      r.start_date < period.end,
  );
  const annualAllowance = getAnnualAllowance(employee.joined_at);
  const usedDays = relevant
    .filter(
      (r) => r.status === "approved" && deductsAnnualLeave(r.leave_type, employee.joined_at),
    )
    .reduce((s, r) => s + r.days, 0);
  const pendingDays = relevant
    .filter(
      (r) => r.status === "pending" && deductsAnnualLeave(r.leave_type, employee.joined_at),
    )
    .reduce((s, r) => s + r.days, 0);
  return {
    id: employee.id,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    role: employee.role,
    joinedAt: employee.joined_at,
    status: employee.status,
    resignedAt: employee.resigned_at,
    ordinaryHourlyWage: employee.ordinary_hourly_wage,
    annualAllowance,
    usedDays,
    pendingDays,
    remainingDays: Math.max(0, annualAllowance - usedDays - pendingDays),
    companyName: employee.company_name,
    email: employee.email,
    employeeNumber: employee.employee_number,
  };
}

function toRequestResponse(
  request: LeaveRequest,
  employee: Employee,
  registeredByName?: string | null,
): Record<string, unknown> {
  return {
    id: request.id,
    employeeId: request.employee_id,
    employeeName: employee.name,
    department: employee.department,
    leaveType: normalizeLeaveType(request.leave_type),
    timeSlot:
      request.time_slot ??
      (request.leave_type === "half_day_am"
        ? "start"
        : request.leave_type === "half_day_pm"
          ? "end"
          : null),
    startDate: request.start_date,
    endDate: request.end_date,
    days: request.days,
    reason: request.reason,
    status: request.status,
    createdAt: request.created_at,
    processedAt: request.processed_at,
    rejectionReason: request.rejection_reason,
    recordSource: request.record_source,
    registeredByEmployeeId: request.registered_by_employee_id,
    registeredByName: registeredByName ?? null,
  };
}

// ──────────────────────────────────────────────
// Route Handlers
// ──────────────────────────────────────────────

async function handleHealthz(): Promise<Response> {
  return json({ status: "ok" });
}

// GET /me/employee
async function handleGetMyEmployee(clerkUserId: string): Promise<Response> {
  const supabase = db();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();
  if (error || !employee) {
    return json({ error: "직원 프로필이 등록되지 않았습니다." }, 404);
  }
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employee.id);
  return json(summarizeEmployee(employee, requests ?? []));
}

// POST /me/employee
async function handleRegisterMyEmployee(
  clerkUserId: string,
  payload: JWTPayload,
  body: unknown,
): Promise<Response> {
  const supabase = db();
  // Already linked?
  const { data: existing } = await supabase
    .from("employees")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();
  if (existing) {
    const { data: requests } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", existing.id);
    return json(summarizeEmployee(existing, requests ?? []));
  }

  // Get email from JWT claims (Clerk session token must include email)
  const email = (payload as Record<string, unknown>).email as string | undefined;
  const emailVerified =
    (payload as Record<string, unknown>).email_verified === "verified" ||
    (payload as Record<string, unknown>).email_verified === true;
  if (!email || !emailVerified) {
    // Fallback: try body email (for backwards compat)
    const b = body as Record<string, unknown> | null;
    const bodyEmail = typeof b?.email === "string" ? b.email.toLowerCase() : null;
    if (!bodyEmail) {
      return json(
        { error: "인증된 이메일을 확인할 수 없습니다. Clerk 세션 설정을 확인해 주세요." },
        400,
      );
    }
    return await linkEmployeeByEmail(supabase, clerkUserId, bodyEmail);
  }
  return await linkEmployeeByEmail(supabase, clerkUserId, email.toLowerCase());
}

async function linkEmployeeByEmail(
  supabase: ReturnType<typeof createClient>,
  clerkUserId: string,
  email: string,
): Promise<Response> {
  const { data: matches } = await supabase
    .from("employees")
    .select("*")
    .ilike("email", email);
  if ((matches ?? []).length > 1) {
    return json(
      { error: "중복된 직원 이메일입니다. 인사 담당자에게 문의해 주세요." },
      409,
    );
  }
  const preProvisioned = matches?.[0] as Employee | undefined;
  if (!preProvisioned || preProvisioned.status !== "active") {
    return json(
      {
        error:
          "관리자가 사전 등록한 이메일과 일치하지 않습니다. 인사 담당자에게 문의해 주세요.",
      },
      403,
    );
  }
  if (
    preProvisioned.clerk_user_id &&
    preProvisioned.clerk_user_id !== clerkUserId
  ) {
    return json({ error: "이미 다른 계정에 연결된 직원입니다." }, 409);
  }
  const { data: linked, error } = await supabase
    .from("employees")
    .update({ clerk_user_id: clerkUserId })
    .eq("id", preProvisioned.id)
    .select("*")
    .single();
  if (error || !linked) {
    return json({ error: "연결에 실패했습니다." }, 500);
  }
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", linked.id);
  return json(summarizeEmployee(linked, requests ?? []), 201);
}

// GET /employees
async function handleGetEmployees(
  actor: Employee,
  url: URL,
): Promise<Response> {
  if (actor.role !== "관리자") {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }
  const supabase = db();
  const search = url.searchParams.get("search") ?? undefined;
  let query = supabase
    .from("employees")
    .select("*")
    .eq("company_name", actor.company_name ?? "")
    .order("name");

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,department.ilike.%${search}%,role.ilike.%${search}%`,
    );
  }

  const { data: employees, error } = await query;
  if (error) return json({ error: error.message }, 500);

  if (!employees?.length) return json([]);

  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .in(
      "employee_id",
      employees.map((e: Employee) => e.id),
    );

  return json(
    employees.map((e: Employee) =>
      summarizeEmployee(e, (requests ?? []) as LeaveRequest[]),
    ),
  );
}

// GET /employees/:id/balance
async function handleGetEmployeeBalance(
  actor: Employee,
  id: number,
): Promise<Response> {
  const supabase = db();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !employee) {
    return json({ error: "직원을 찾을 수 없습니다." }, 404);
  }
  if (
    employee.company_name !== actor.company_name ||
    (actor.role !== "관리자" && employee.id !== actor.id)
  ) {
    return json({ error: "조회 권한이 없습니다." }, 403);
  }
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employee.id);
  const s = summarizeEmployee(employee, (requests ?? []) as LeaveRequest[]);
  return json({
    employeeId: s.id,
    annualAllowance: s.annualAllowance,
    usedDays: s.usedDays,
    pendingDays: s.pendingDays,
    remainingDays: s.remainingDays,
  });
}

// GET /leave-requests
async function handleGetLeaveRequests(
  actor: Employee,
  url: URL,
): Promise<Response> {
  const supabase = db();
  const status = url.searchParams.get("status") ?? undefined;
  const search = url.searchParams.get("search")?.toLowerCase() ?? undefined;
  const employeeIdParam = url.searchParams.get("employeeId");
  const employeeId = employeeIdParam ? Number(employeeIdParam) : undefined;
  const year = url.searchParams.get("year")
    ? Number(url.searchParams.get("year"))
    : undefined;
  const month = url.searchParams.get("month")
    ? Number(url.searchParams.get("month"))
    : undefined;

  if (actor.role !== "관리자" && employeeId && employeeId !== actor.id) {
    return json({ error: "다른 직원의 신청 내역을 조회할 수 없습니다." }, 403);
  }

  // Fetch all requests + employees for this company
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("company_name", actor.company_name ?? "");
  const employeeIds = new Set((employees ?? []).map((e: Employee) => e.id));
  const empMap = new Map(
    (employees ?? []).map((e: Employee) => [e.id, e]),
  );

  let requestQuery = supabase
    .from("leave_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (actor.role !== "관리자") {
    requestQuery = requestQuery.eq("employee_id", actor.id);
  } else if (employeeId) {
    requestQuery = requestQuery.eq("employee_id", employeeId);
  }

  const { data: requests, error } = await requestQuery;
  if (error) return json({ error: error.message }, 500);

  // Build registeredBy name map
  const actorIds = [
    ...new Set(
      (requests ?? [])
        .map((r: LeaveRequest) => r.registered_by_employee_id)
        .filter((id): id is number => id !== null),
    ),
  ];
  let registeredByMap: Map<number, string> = new Map();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("employees")
      .select("id, name")
      .in("id", actorIds);
    registeredByMap = new Map(
      (actors ?? []).map((a: { id: number; name: string }) => [a.id, a.name]),
    );
  }

  const filtered = (requests ?? []).filter((r: LeaveRequest) => {
    if (!employeeIds.has(r.employee_id)) return false;
    if (actor.role !== "관리자" && r.employee_id !== actor.id) return false;
    if (status && r.status !== status) return false;
    if (employeeId && r.employee_id !== employeeId) return false;
    if (year && Number(r.start_date.slice(0, 4)) !== year) return false;
    if (month && Number(r.start_date.slice(5, 7)) !== month) return false;
    if (search) {
      const emp = empMap.get(r.employee_id) as Employee | undefined;
      const haystack = [emp?.name, emp?.department, r.reason]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  return json(
    filtered.map((r: LeaveRequest) =>
      toRequestResponse(
        r,
        empMap.get(r.employee_id) as Employee,
        r.registered_by_employee_id
          ? (registeredByMap.get(r.registered_by_employee_id) ?? null)
          : null,
      ),
    ),
  );
}

// POST /leave-requests
async function handleCreateLeaveRequest(
  actor: Employee,
  body: unknown,
): Promise<Response> {
  const b = body as Record<string, unknown>;
  const leaveType = b.leaveType as string;
  const startDate = new Date(b.startDate as string);
  const endDate = new Date(b.endDate as string);
  const days = b.days as number;
  const reason = (b.reason as string)?.trim();
  const timeSlot = (b.timeSlot as string | null) ?? null;
  const employeeId = b.employeeId
    ? Number(b.employeeId)
    : actor.id;

  if (!leaveType || !startDate || !endDate || !reason) {
    return json({ error: "입력값을 확인해 주세요." }, 400);
  }
  if (actor.role !== "관리자" && employeeId !== actor.id) {
    return json({ error: "본인의 휴가만 신청할 수 있습니다." }, 403);
  }

  const supabase = db();
  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();
  if (empErr || !employee) {
    return json({ error: "직원을 찾을 수 없습니다." }, 400);
  }
  if (
    employee.company_name !== actor.company_name ||
    (actor.role !== "관리자" && employee.id !== actor.id)
  ) {
    return json({ error: "신청 권한이 없습니다." }, 403);
  }

  const calculatedDays = calculateRequestDays(leaveType, startDate, endDate);
  if (calculatedDays === null || calculatedDays !== days) {
    return json({ error: "휴가 종류와 기간에 맞지 않는 사용 일수입니다." }, 400);
  }

  const { data: existingReqs } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employee.id);
  const balance = summarizeEmployee(
    employee,
    (existingReqs ?? []) as LeaveRequest[],
  );

  if (
    ["annual", "half_day", "quarter_day"].includes(leaveType) &&
    days > (balance.remainingDays as number)
  ) {
    return json({ error: "잔여 연차가 부족합니다." }, 400);
  }
  if (
    ["half_day", "quarter_day"].includes(leaveType) &&
    !timeSlot
  ) {
    return json(
      { error: "반차·반반차는 출근 또는 퇴근 연결을 선택해 주세요." },
      400,
    );
  }

  const { data: created, error: insertErr } = await supabase
    .from("leave_requests")
    .insert({
      employee_id: employee.id,
      registered_by_employee_id: actor.id,
      record_source: "employee_request",
      leave_type: leaveType,
      time_slot: timeSlot,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      days: calculatedDays,
      reason,
      status: "pending",
    })
    .select("*")
    .single();
  if (insertErr || !created) {
    return json({ error: "신청에 실패했습니다." }, 500);
  }

  return json(toRequestResponse(created, employee), 201);
}

// GET /leave-requests/:id
async function handleGetLeaveRequest(
  actor: Employee,
  id: number,
): Promise<Response> {
  const supabase = db();
  const { data: request, error } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !request) {
    return json({ error: "연차 신청을 찾을 수 없습니다." }, 404);
  }
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", request.employee_id)
    .single();
  if (!employee) return json({ error: "연차 신청을 찾을 수 없습니다." }, 404);
  if (
    employee.company_name !== actor.company_name ||
    (actor.role !== "관리자" && employee.id !== actor.id)
  ) {
    return json({ error: "조회 권한이 없습니다." }, 403);
  }
  let registeredByName: string | null = null;
  if (request.registered_by_employee_id) {
    const { data: registeredBy } = await supabase
      .from("employees")
      .select("name")
      .eq("id", request.registered_by_employee_id)
      .single();
    registeredByName = registeredBy?.name ?? null;
  }
  return json(toRequestResponse(request, employee, registeredByName));
}

// PATCH /leave-requests/:id/status
async function handleUpdateLeaveRequestStatus(
  actor: Employee,
  id: number,
  body: unknown,
): Promise<Response> {
  if (actor.role !== "관리자") {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }
  const b = body as Record<string, unknown>;
  const status = b.status as string;
  const rejectionReason =
    status === "rejected" ? ((b.rejectionReason as string) ?? null) : null;

  const supabase = db();
  const { data: existing } = await supabase
    .from("leave_requests")
    .select("*, employees!inner(company_name)")
    .eq("id", id)
    .single();
  if (!existing || (existing as { employees: { company_name: string } }).employees.company_name !== actor.company_name) {
    return json({ error: "연차 신청을 찾을 수 없습니다." }, 404);
  }

  const { data: updated, error } = await supabase
    .from("leave_requests")
    .update({
      status,
      processed_at: status === "pending" ? null : new Date().toISOString(),
      rejection_reason: rejectionReason,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !updated) {
    return json({ error: "상태 변경에 실패했습니다." }, 500);
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", updated.employee_id)
    .single();
  if (!employee) return json({ error: "연차 신청을 찾을 수 없습니다." }, 404);

  return json(toRequestResponse(updated, employee));
}

// POST /attendance/records
async function handleCreateAttendanceRecord(
  actor: Employee,
  body: unknown,
): Promise<Response> {
  if (actor.role !== "관리자") {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }
  const b = body as Record<string, unknown>;
  const employeeId = Number(b.employeeId);
  const attendanceType = b.attendanceType as string;
  const startDate = new Date(b.startDate as string);
  const endDate = new Date(b.endDate as string);
  const days = b.days as number;
  const reason = (b.reason as string)?.trim();

  const supabase = db();
  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();
  if (empErr || !employee) {
    return json({ error: "직원을 찾을 수 없습니다." }, 400);
  }
  if (employee.company_name !== actor.company_name) {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }

  const calculatedDays = calculateRequestDays(
    attendanceType,
    startDate,
    endDate,
  );
  if (calculatedDays === null || calculatedDays !== days) {
    return json({ error: "부재 기간과 일수가 일치하지 않습니다." }, 400);
  }

  const deductsBalance =
    attendanceType === "annual" ||
    (attendanceType === "absence" &&
      getAnnualAllowance(employee.joined_at) < 15);

  if (deductsBalance) {
    const { data: existingReqs } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employee.id);
    const balance = summarizeEmployee(
      employee,
      (existingReqs ?? []) as LeaveRequest[],
    );
    if (calculatedDays > (balance.remainingDays as number)) {
      return json({ error: "차감할 잔여 연차가 부족합니다." }, 400);
    }
  }

  const { data: created, error: insertErr } = await supabase
    .from("leave_requests")
    .insert({
      employee_id: employee.id,
      registered_by_employee_id: actor.id,
      record_source: "admin_attendance",
      leave_type: attendanceType,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      days: calculatedDays,
      reason,
      status: "approved",
      processed_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (insertErr || !created) {
    return json({ error: "기록에 실패했습니다." }, 500);
  }

  // audit log
  await supabase.from("audit_logs").insert({
    actor_employee_id: actor.id,
    target_employee_id: employee.id,
    action: "attendance_record_created",
    entity_type: "leave_request",
    entity_id: created.id,
    details: {
      attendanceType,
      startDate: created.start_date,
      endDate: created.end_date,
      days: created.days,
      reason: created.reason,
    },
  });

  return json(toRequestResponse(created, employee, actor.name), 201);
}

// GET /dashboard/summary
async function handleDashboardSummary(actor: Employee): Promise<Response> {
  if (actor.role !== "관리자") {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }
  const supabase = db();

  const [{ data: allEmployees }, { data: allRequests }] = await Promise.all([
    supabase.from("employees").select("*").eq("company_name", actor.company_name ?? ""),
    supabase.from("leave_requests").select("*"),
  ]);

  const employees = (allEmployees ?? []) as Employee[];
  const employeeIds = new Set(employees.map((e) => e.id));
  const requests = ((allRequests ?? []) as LeaveRequest[]).filter((r) =>
    employeeIds.has(r.employee_id),
  );

  const summaries = employees.map((e) => summarizeEmployee(e, requests));

  const year = new Date().getFullYear();
  const monthlyUsage = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month: `${month}월`,
      days: requests
        .filter((r) => {
          const emp = employees.find((e) => e.id === r.employee_id);
          if (!emp || !deductsAnnualLeave(r.leave_type, emp.joined_at)) return false;
          return (
            r.status === "approved" &&
            Number(r.start_date.slice(0, 4)) === year &&
            Number(r.start_date.slice(5, 7)) === month
          );
        })
        .reduce((s, r) => s + r.days, 0),
    };
  });

  const today = new Date().toISOString().slice(0, 10);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const upcomingLeaves = requests
    .filter((r) => r.status === "approved" && r.start_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5)
    .map((r) => {
      const emp = empMap.get(r.employee_id) as Employee;
      return {
        id: r.id,
        employeeName: emp?.name ?? "",
        leaveType: normalizeLeaveType(r.leave_type),
        startDate: r.start_date,
        endDate: r.end_date,
        days: r.days,
      };
    });

  return json({
    year,
    annualAllowance: summaries.reduce((s, e) => s + (e.annualAllowance as number), 0),
    usedDays: summaries.reduce((s, e) => s + (e.usedDays as number), 0),
    remainingDays: summaries.reduce((s, e) => s + (e.remainingDays as number), 0),
    pendingDays: summaries.reduce((s, e) => s + (e.pendingDays as number), 0),
    employeeCount: employees.length,
    pendingRequestCount: requests.filter((r) => r.status === "pending").length,
    approvedRequestCount: requests.filter((r) => r.status === "approved").length,
    upcomingLeaves,
    monthlyUsage,
  });
}

// ── Admin employee routes ──

// GET /admin/employees
async function handleAdminGetEmployees(
  actor: Employee,
  url: URL,
): Promise<Response> {
  const supabase = db();
  const search = url.searchParams.get("search")?.trim() ?? undefined;
  let query = supabase
    .from("employees")
    .select("*")
    .eq("company_name", actor.company_name ?? "");
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,employee_number.ilike.%${search}%,department.ilike.%${search}%`,
    );
  }
  const { data: employees, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const { data: allRequests } = await supabase.from("leave_requests").select("*");
  return json(
    await Promise.all(
      (employees ?? []).map((e: Employee) =>
        buildAdminEmployeeResponse(e, (allRequests ?? []) as LeaveRequest[]),
      ),
    ),
  );
}

// POST /admin/employees
async function handleAdminCreateEmployee(
  actor: Employee,
  body: unknown,
): Promise<Response> {
  const b = body as Record<string, unknown>;
  const email = (b.email as string).trim().toLowerCase();
  const employeeNumber = (b.employeeNumber as string).trim();
  const joinedAt = new Date(b.joinedAt as string).toISOString().slice(0, 10);

  const supabase = db();
  // Duplicate check
  const { data: dups } = await supabase
    .from("employees")
    .select("*")
    .or(
      `email.ilike.${email},and(company_name.eq.${actor.company_name ?? ""},employee_number.eq.${employeeNumber})`,
    );
  if (
    (dups ?? []).some(
      (d: Employee) =>
        (d.email ?? "").toLowerCase() === email ||
        d.employee_number === employeeNumber,
    )
  ) {
    return json(
      { error: "이메일 또는 사번이 이미 등록되어 있습니다." },
      409,
    );
  }

  const { data: created, error } = await supabase
    .from("employees")
    .insert({
      company_name: actor.company_name,
      employee_number: employeeNumber,
      name: (b.name as string).trim(),
      email,
      department: (b.department as string).trim(),
      position: (b.position as string)?.trim() ?? "",
      role: b.role as string,
      joined_at: joinedAt,
      status: "active",
      ordinary_hourly_wage: b.ordinaryHourlyWage as number ?? 0,
      annual_allowance: getAnnualAllowance(joinedAt),
    })
    .select("*")
    .single();
  if (error || !created) {
    return json({ error: error?.message ?? "등록에 실패했습니다." }, 500);
  }
  return json(await buildAdminEmployeeResponse(created, []), 201);
}

// GET /admin/employees/:id
async function handleAdminGetEmployee(
  actor: Employee,
  id: number,
): Promise<Response> {
  const supabase = db();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .eq("company_name", actor.company_name ?? "")
    .single();
  if (error || !employee) {
    return json({ error: "직원을 찾을 수 없습니다." }, 404);
  }
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employee.id);
  return json(
    await buildAdminEmployeeResponse(employee, (requests ?? []) as LeaveRequest[]),
  );
}

// PATCH /admin/employees/:id
async function handleAdminUpdateEmployee(
  actor: Employee,
  id: number,
  body: unknown,
): Promise<Response> {
  const b = body as Record<string, unknown>;
  const supabase = db();

  const { data: employee, error: findErr } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .eq("company_name", actor.company_name ?? "")
    .single();
  if (findErr || !employee) {
    return json({ error: "직원을 찾을 수 없습니다." }, 404);
  }

  const newEmail = b.email ? (b.email as string).trim().toLowerCase() : undefined;
  const newEmployeeNumber = b.employeeNumber
    ? (b.employeeNumber as string).trim()
    : undefined;

  // Prevent email change for active accounts
  if (
    employee.clerk_user_id &&
    newEmail &&
    newEmail !== (employee.email ?? "").toLowerCase()
  ) {
    return json(
      { error: "활성���된 계정의 이메일은 변경할 수 없습니다." },
      409,
    );
  }

  // Duplicate check
  if (newEmail || newEmployeeNumber) {
    const conditions: string[] = [];
    if (newEmail) conditions.push(`email.ilike.${newEmail}`);
    if (newEmployeeNumber) {
      conditions.push(
        `and(company_name.eq.${actor.company_name ?? ""},employee_number.eq.${newEmployeeNumber})`,
      );
    }
    const { data: dups } = await supabase
      .from("employees")
      .select("*")
      .neq("id", employee.id)
      .or(conditions.join(","));
    if ((dups ?? []).length > 0) {
      return json(
        { error: "이메일 또는 사번이 이미 등록되어 있습니다." },
        409,
      );
    }
  }

  // Last admin guard
  if (employee.role === "관리자" && b.role === "직원") {
    const { data: admins } = await supabase
      .from("employees")
      .select("*")
      .eq("company_name", actor.company_name ?? "")
      .eq("role", "관리자")
      .eq("status", "active");
    if ((admins ?? []).length <= 1) {
      return json({ error: "최소 한 명의 활성 관리자가 필요합니다." }, 409);
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (newEmployeeNumber !== undefined) updateFields.employee_number = newEmployeeNumber;
  if (b.name) updateFields.name = (b.name as string).trim();
  if (newEmail !== undefined) updateFields.email = newEmail;
  if (b.department) updateFields.department = (b.department as string).trim();
  if (b.position !== undefined) updateFields.position = (b.position as string)?.trim() ?? "";
  if (b.role) updateFields.role = b.role;
  if (b.joinedAt) updateFields.joined_at = new Date(b.joinedAt as string).toISOString().slice(0, 10);
  if (b.ordinaryHourlyWage !== undefined) updateFields.ordinary_hourly_wage = b.ordinaryHourlyWage;

  const { data: updated, error: updateErr } = await supabase
    .from("employees")
    .update(updateFields)
    .eq("id", employee.id)
    .select("*")
    .single();
  if (updateErr || !updated) {
    return json({ error: updateErr?.message ?? "수정에 실패했습니다." }, 500);
  }
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", updated.id);
  return json(
    await buildAdminEmployeeResponse(
      updated,
      (requests ?? []) as LeaveRequest[],
    ),
  );
}

// POST /admin/employees/:id/resign
async function handleAdminResignEmployee(
  actor: Employee,
  id: number,
  body: unknown,
): Promise<Response> {
  const b = body as Record<string, unknown>;
  const resignedAt = new Date(b.resignedAt as string).toISOString().slice(0, 10);
  const supabase = db();

  const { data: employee, error: findErr } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .eq("company_name", actor.company_name ?? "")
    .single();
  if (findErr || !employee) {
    return json({ error: "직원을 찾을 수 없습니다." }, 404);
  }
  if (employee.id === actor.id) {
    return json(
      { error: "현재 로그인한 관리자 본인은 퇴사 처리할 수 없습니다." },
      409,
    );
  }

  if (employee.role === "관리자") {
    const { data: admins } = await supabase
      .from("employees")
      .select("*")
      .eq("company_name", actor.company_name ?? "")
      .eq("role", "관리자")
      .eq("status", "active");
    if ((admins ?? []).length <= 1) {
      return json({ error: "최소 한 명의 활성 관리자가 필요합니다." }, 409);
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("employees")
    .update({
      status: "resigned",
      resigned_at: resignedAt,
      clerk_user_id: null,
    })
    .eq("id", employee.id)
    .select("*")
    .single();
  if (updateErr || !updated) {
    return json({ error: "퇴사 처리에 실패했습니다." }, 500);
  }
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", updated.id);
  return json(
    await buildAdminEmployeeResponse(
      updated,
      (requests ?? []) as LeaveRequest[],
    ),
  );
}

async function buildAdminEmployeeResponse(
  employee: Employee,
  requests: LeaveRequest[],
): Promise<Record<string, unknown>> {
  const allowance = getAnnualAllowance(employee.joined_at);
  const relevant = requests.filter((r) =>
    ["annual", "half_day", "half_day_am", "half_day_pm", "quarter_day"].includes(
      r.leave_type,
    ),
  );
  const usedDays = relevant
    .filter((r) => r.status === "approved")
    .reduce((s, r) => s + r.days, 0);
  const pendingDays = relevant
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.days, 0);
  return {
    id: employee.id,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    role: employee.role,
    joinedAt: employee.joined_at,
    status: employee.status,
    resignedAt: employee.resigned_at,
    ordinaryHourlyWage: employee.ordinary_hourly_wage,
    annualAllowance: allowance,
    usedDays,
    pendingDays,
    remainingDays: Math.max(0, allowance - usedDays - pendingDays),
    companyName: employee.company_name,
    email: employee.email,
    employeeNumber: employee.employee_number,
  };
}

// ──────────────────────────────────────────────
// Main Router
// ──────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  // Strip /functions/v1/api prefix to get the local path
  const path = url.pathname
    .replace(/^\/functions\/v1\/api/, "")
    .replace(/^\/?/, "/");
  const method = req.method;

  // Health check (no auth)
  if (method === "GET" && path === "/api/healthz") {
    return handleHealthz();
  }

  // All other routes require auth
  let payload: JWTPayload & { sub: string };
  try {
    payload = await verifyClerkJWT(req.headers.get("authorization"));
  } catch (err) {
    const e = err as Error & { status?: number };
    return json({ error: e.message }, e.status ?? 401);
  }
  const clerkUserId = payload.sub;
  const supabase = db();

  // /me/employee routes (don't require pre-existing actor)
  if (method === "GET" && path === "/api/me/employee") {
    return handleGetMyEmployee(clerkUserId);
  }
  if (method === "POST" && path === "/api/me/employee") {
    const body = await req.json().catch(() => null);
    return handleRegisterMyEmployee(clerkUserId, payload, body);
  }

  // All other routes require an existing employee record
  const { data: actor, error: actorErr } = await supabase
    .from("employees")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (actorErr || !actor) {
    return json({ error: "직원 프로필 등록이 필요합니다." }, 403);
  }
  if ((actor as Employee).status === "resigned") {
    return json({ error: "퇴사한 직원은 접근할 수 없습니다." }, 403);
  }

  // Admin middleware check for /admin routes
  if (path.startsWith("/api/admin")) {
    if ((actor as Employee).status !== "active" || (actor as Employee).role !== "관리자") {
      return json({ error: "관리자 권한이 필요합니다." }, 403);
    }
  }

  // Parse body for mutating requests
  const body =
    ["POST", "PATCH", "PUT"].includes(method)
      ? await req.json().catch(() => null)
      : null;

  try {
    // ─ Leave routes ─
    if (method === "GET" && path === "/api/dashboard/summary") {
      return handleDashboardSummary(actor as Employee);
    }
    if (method === "GET" && path === "/api/employees") {
      return handleGetEmployees(actor as Employee, url);
    }
    const balanceMatch = path.match(/^\/api\/employees\/(\d+)\/balance$/);
    if (method === "GET" && balanceMatch) {
      return handleGetEmployeeBalance(actor as Employee, Number(balanceMatch[1]));
    }
    if (method === "GET" && path === "/api/leave-requests") {
      return handleGetLeaveRequests(actor as Employee, url);
    }
    if (method === "POST" && path === "/api/leave-requests") {
      return handleCreateLeaveRequest(actor as Employee, body);
    }
    const requestMatch = path.match(/^\/api\/leave-requests\/(\d+)$/);
    if (method === "GET" && requestMatch) {
      return handleGetLeaveRequest(actor as Employee, Number(requestMatch[1]));
    }
    const statusMatch = path.match(/^\/api\/leave-requests\/(\d+)\/status$/);
    if (method === "PATCH" && statusMatch) {
      return handleUpdateLeaveRequestStatus(
        actor as Employee,
        Number(statusMatch[1]),
        body,
      );
    }
    if (method === "POST" && path === "/api/attendance/records") {
      return handleCreateAttendanceRecord(actor as Employee, body);
    }

    // ─ Admin routes ─
    if (method === "GET" && path === "/api/admin/employees") {
      return handleAdminGetEmployees(actor as Employee, url);
    }
    if (method === "POST" && path === "/api/admin/employees") {
      return handleAdminCreateEmployee(actor as Employee, body);
    }
    const adminEmpMatch = path.match(/^\/api\/admin\/employees\/(\d+)$/);
    if (method === "GET" && adminEmpMatch) {
      return handleAdminGetEmployee(actor as Employee, Number(adminEmpMatch[1]));
    }
    if (method === "PATCH" && adminEmpMatch) {
      return handleAdminUpdateEmployee(
        actor as Employee,
        Number(adminEmpMatch[1]),
        body,
      );
    }
    const resignMatch = path.match(/^\/api\/admin\/employees\/(\d+)\/resign$/);
    if (method === "POST" && resignMatch) {
      return handleAdminResignEmployee(
        actor as Employee,
        Number(resignMatch[1]),
        body,
      );
    }

    return json({ error: "Not Found" }, 404);
  } catch (err) {
    const e = err as Error;
    console.error(e);
    return json({ error: e.message ?? "서버 오류가 발생했습니다." }, 500);
  }
});
