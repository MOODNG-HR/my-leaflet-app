import { createInsertSchema } from "drizzle-zod";
import { date, pgTable, real, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  role: text("role").notNull(),
  joinedAt: date("joined_at", { mode: "string" }).notNull(),
  annualAllowance: real("annual_allowance").notNull().default(15),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({
  id: true,
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;