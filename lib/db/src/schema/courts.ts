import { boolean, index, integer, pgTable, real, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const courtsTable = pgTable(
  "courts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sport: text("sport").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    address: text("address").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    activeCount: integer("active_count").default(0).notNull(),
    localCount: integer("local_count").default(0).notNull(),
    maxCapacity: integer("max_capacity").default(10).notNull(),
    rating: real("rating").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    surface: text("surface").default("ASPHALT").notNull(),
    lights: boolean("lights").default(false).notNull(),
    covered: boolean("covered").default(false).notNull(),
    status: text("status").default("confirmed").notNull(),
    popularity: integer("popularity").default(0).notNull(),
    addedBy: text("added_by"),
    verificationPhoto: text("verification_photo"),
  },
  (table) => [
    index("idx_courts_lat_lng").on(table.latitude, table.longitude),
    index("idx_courts_popularity").on(table.popularity),
    index("idx_courts_state").on(table.state),
  ]
);

export const insertCourtSchema = createInsertSchema(courtsTable).omit({ id: true });
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type CourtRow = typeof courtsTable.$inferSelect;
