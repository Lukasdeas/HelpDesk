import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, uuid, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("technician"), // 'technician' or 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: serial("ticket_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sector: text("sector").notNull(),
  problemType: text("problem_type").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  requesterName: text("requester_name").notNull(),
  userEmail: text("user_email").notNull(),
  assignedToId: uuid("assigned_to_id").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  attachments: text("attachments").array().default(sql`'{}'`),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  authorType: text("author_type").notNull(), // 'user', 'technician'
  attachments: jsonb("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  sector: z.string().min(1, "Setor é obrigatório"),
  problemType: z.string().min(1, "Tipo de problema é obrigatório"),
  priority: z.enum(["waiting", "low", "medium", "high"]).default("waiting"),
  status: z.enum(["waiting", "open", "in_progress", "resolved"]).default("waiting"),
  requesterName: z.string().min(1, "Nome do solicitante é obrigatório"),
  userEmail: z.string().email("Email inválido"),
  attachments: z.array(z.string()).optional(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type TicketWithDetails = Ticket & {
  assignedTo?: User;
  comments: Comment[];
};