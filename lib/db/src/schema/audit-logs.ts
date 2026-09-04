import { jsonb, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorEmployeeId: integer("actor_employee_id")
    .notNull()
    .references(() => employeesTable.id),
  targetEmployeeId: integer("target_employee_id")
    .notNull()
    .references(() => employeesTable.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});