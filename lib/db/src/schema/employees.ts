import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { date, pgTable, real, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const employeesTable = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id"),
    companyName: text("company_name"),
    email: text("email"),
    employeeNumber: text("employee_number"),
    name: text("name").notNull(),
    department: text("department").notNull(),
    position: text("position").notNull().default(""),
    role: text("role").notNull(),
    joinedAt: date("joined_at", { mode: "string" }).notNull(),
    status: text("status").notNull().default("active"),
    resignedAt: date("resigned_at", { mode: "string" }),
    ordinaryHourlyWage: real("ordinary_hourly_wage").notNull().default(0),
    annualAllowance: real("annual_allowance").notNull().default(15),
  },
  (table) => [
    uniqueIndex("employees_email_unique_ci")
      .on(sql`lower(${table.email})`)
      .where(sql`${table.email} is not null`),
    uniqueIndex("employees_clerk_user_id_unique")
      .on(table.clerkUserId)
      .where(sql`${table.clerkUserId} is not null`),
  ],
);

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({
  id: true,
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;