-- ============================================================
-- 무등기업 HR Management System - Supabase Schema
-- ============================================================

-- employees 테이블
create table if not exists employees (
  id serial primary key,
  clerk_user_id text unique,
  company_name text,
  email text,
  employee_number text,
  name text not null,
  department text not null,
  position text not null default '',
  role text not null,
  joined_at date not null,
  status text not null default 'active',
  resigned_at date,
  ordinary_hourly_wage real not null default 0,
  annual_allowance real not null default 15
);

-- 이메일 대소문자 구분 없는 유니크 인덱스
create unique index if not exists employees_email_unique_ci
  on employees (lower(email))
  where email is not null;

-- leave_requests 테이블
create table if not exists leave_requests (
  id serial primary key,
  employee_id integer not null references employees(id),
  registered_by_employee_id integer references employees(id),
  record_source text not null default 'employee_request',
  leave_type text not null,
  time_slot text,
  start_date date not null,
  end_date date not null,
  days real not null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  rejection_reason text
);

-- audit_logs 테이블
create table if not exists audit_logs (
  id serial primary key,
  actor_employee_id integer not null references employees(id),
  target_employee_id integer not null references employees(id),
  action text not null,
  entity_type text not null,
  entity_id integer,
  details jsonb not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- Edge Function은 service_role 키를 사용해 RLS를 우회하므로
-- RLS는 직접 Supabase 클라이언트 사용 시를 위한 보호막입니다.
-- ============================================================

alter table employees enable row level security;
alter table leave_requests enable row level security;
alter table audit_logs enable row level security;

-- service_role은 RLS를 우회합니다 (Edge Function에서 사용)
-- 아래 정책은 anon/authenticated 역할에 대한 최소 정책입니다.

-- 아무도 직접 접근 불가 (Edge Function을 통해서만 접근)
create policy "No direct access to employees"
  on employees for all
  using (false);

create policy "No direct access to leave_requests"
  on leave_requests for all
  using (false);

create policy "No direct access to audit_logs"
  on audit_logs for all
  using (false);
