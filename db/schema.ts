import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("presence_users", {
  userId: text("user_id").primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  firstSeen: integer("first_seen").notNull(),
  lastSeen: integer("last_seen").notNull(),
}, table => [index("users_last_seen").on(table.lastSeen)]);
export const sessions = sqliteTable("presence_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.userId),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  lastSeen: integer("last_seen").notNull(),
  expiresAt: integer("expires_at").notNull(),
  endedAt: integer("ended_at"),
  placeId: text("place_id"),
  gameName: text("game_name"),
}, table => [index("sessions_presence").on(table.userId, table.endedAt, table.expiresAt)]);
export const rateLimits = sqliteTable("presence_rate_limits", {
  bucket: text("bucket").primaryKey(),
  hits: integer("hits").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
