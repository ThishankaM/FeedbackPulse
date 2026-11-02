import { timestamp, uuid } from 'drizzle-orm/pg-core';

export const primaryUuid = () => uuid('id').defaultRandom().primaryKey();

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};
