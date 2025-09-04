import {
  users,
  tickets,
  comments,
  type User,
  type InsertUser,
  type Ticket,
  type InsertTicket,
  type Comment,
  type InsertComment,
  type TicketWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllTechnicians(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Ticket operations
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicket(id: string): Promise<TicketWithDetails | undefined>;
  getAllTickets(): Promise<TicketWithDetails[]>;
  getTicketsByStatus(status: string): Promise<TicketWithDetails[]>;
  updateTicketPriority(id: string, priority: string): Promise<void>;
  updateTicketStatus(id: string, status: string): Promise<void>;
  assignTicket(id: string, technicianId: string): Promise<void>;

  // Comment operations
  addComment(comment: InsertComment): Promise<Comment>;
  getTicketComments(ticketId: string): Promise<Comment[]>;

  // Statistics
  getTicketStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    avgResolutionTimeMinutes: number;
    avgWaitingTimeMinutes: number;
    totalResolutionTimeMinutes: number;
  }>;
  getTechnicianPerformance(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllTechnicians(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(asc(users.name));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createTicket(ticketData: InsertTicket): Promise<Ticket> {
    const [ticket] = await db.insert(tickets).values({
      ...ticketData,
      attachments: ticketData.attachments || [],
      ticketNumber: sql`nextval('ticket_number_seq')`,
      updatedAt: sql`NOW()`,
    }).returning();
    return ticket;
  }

  async getTicket(id: string): Promise<TicketWithDetails | undefined> {
    const [ticket] = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(eq(tickets.id, id));

    if (!ticket) return undefined;

    const ticketComments = await this.getTicketComments(id);

    return {
      ...ticket,
      assignedTo: ticket.assignedTo || undefined,
      comments: ticketComments,
    };
  }

  async getAllTickets(): Promise<TicketWithDetails[]> {
    const ticketsData = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .orderBy(
        sql`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
        desc(tickets.createdAt)
      );

    // Get comments for all tickets
    const allComments = await db
      .select()
      .from(comments)
      .orderBy(asc(comments.createdAt));

    // Group comments by ticket ID
    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {} as Record<string, Comment[]>);

    return ticketsData.map(ticket => ({
      ...ticket,
      assignedTo: ticket.assignedTo || undefined,
      comments: commentsByTicket[ticket.id] || [],
    }));
  }

  async getTicketsByStatus(status: string): Promise<TicketWithDetails[]> {
    const ticketsData = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(eq(tickets.status, status))
      .orderBy(
        sql`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
        desc(tickets.createdAt)
      );

    const allComments = await db
      .select()
      .from(comments)
      .orderBy(asc(comments.createdAt));

    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {} as Record<string, Comment[]>);

    return ticketsData.map(ticket => ({
      ...ticket,
      assignedTo: ticket.assignedTo || undefined,
      comments: commentsByTicket[ticket.id] || [],
    }));
  }

  async getTicketsForTechnician(technicianId: string): Promise<TicketWithDetails[]> {
    const ticketsData = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(
        sql`${tickets.assignedToId} = ${technicianId} OR ${tickets.assignedToId} IS NULL`
      )
      .orderBy(
        sql`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
        desc(tickets.createdAt)
      );

    const allComments = await db
      .select()
      .from(comments)
      .orderBy(asc(comments.createdAt));

    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {} as Record<string, Comment[]>);

    return ticketsData.map(ticket => ({
      ...ticket,
      assignedTo: ticket.assignedTo || undefined,
      comments: commentsByTicket[ticket.id] || [],
    }));
  }

  async updateTicketPriority(id: string, priority: string): Promise<void> {
    await db
      .update(tickets)
      .set({ priority, updatedAt: sql`NOW()` })
      .where(eq(tickets.id, id));
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: sql`NOW()`
    };

    // Set resolvedAt timestamp when ticket is resolved
    if (status === 'resolved') {
      updateData.resolvedAt = sql`NOW()`;
    }

    const [ticket] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId))
      .returning();

    return ticket;
  }

  async assignTicket(id: string, technicianId: string): Promise<void> {
    await db
      .update(tickets)
      .set({
        assignedToId: technicianId,
        status: 'in_progress',
        acceptedAt: sql`NOW()`,
        updatedAt: sql`NOW()`
      })
      .where(eq(tickets.id, id));
  }

  async addComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({
        ...comment,
        attachments: comment.attachments || []
      })
      .returning();
    return newComment;
  }

  async getTicketComments(ticketId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.ticketId, ticketId))
      .orderBy(asc(comments.createdAt));
  }

  async getTicketStats() {
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        open: sql<number>`count(case when status = 'open' then 1 end)`,
        inProgress: sql<number>`count(case when status = 'in_progress' then 1 end)`,
        resolved: sql<number>`count(case when status = 'resolved' then 1 end)`,
        highPriority: sql<number>`count(case when priority = 'high' then 1 end)`,
        mediumPriority: sql<number>`count(case when priority = 'medium' then 1 end)`,
        lowPriority: sql<number>`count(case when priority = 'low' then 1 end)`,
        avgResolutionTimeMinutes: sql<number>`
          COALESCE(
            ROUND(
              AVG(
                EXTRACT(EPOCH FROM (resolved_at - accepted_at)) / 60
              )::numeric, 1
            ), 0
          )
        `,
        avgWaitingTimeMinutes: sql<number>`
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN accepted_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60
                  ELSE NULL
                END
              )::numeric, 1
            ), 0
          )
        `,
        totalResolutionTimeMinutes: sql<number>`
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN resolved_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
                  ELSE NULL
                END
              )::numeric, 1
            ), 0
          )
        `
      })
      .from(tickets);

    return result[0];
  }

  async getTechnicianPerformance() {
    const result = await db
      .select({
        technicianId: tickets.assignedToId,
        technicianName: users.name,
        totalTickets: sql<number>`count(*)`,
        resolvedTickets: sql<number>`count(case when ${tickets.status} = 'resolved' then 1 end)`,
        avgResolutionTimeMinutes: sql<number>`
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN ${tickets.resolvedAt} IS NOT NULL AND ${tickets.acceptedAt} IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (${tickets.resolvedAt} - ${tickets.acceptedAt})) / 60
                  ELSE NULL
                END
              )::numeric, 1
            ), 0
          )
        `
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(sql`${tickets.assignedToId} IS NOT NULL`)
      .groupBy(tickets.assignedToId, users.name);

    return result;
  }
}

export const storage = new DatabaseStorage();