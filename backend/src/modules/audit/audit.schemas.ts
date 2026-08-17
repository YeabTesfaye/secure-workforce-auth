import { z } from "zod";

export const auditLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  event: z.string().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
