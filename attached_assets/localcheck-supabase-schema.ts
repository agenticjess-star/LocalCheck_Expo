import { sql } from "drizzle-orm";
import {
  pgSchema,
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  doublePrecision,
  timestamp,
  jsonb,
  customType,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Supabase-managed auth schema — reference only, Supabase owns this  */
/* ------------------------------------------------------------------ */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

/* ------------------------------------------------------------------ */
/* citext — Postgres case-insensitive text, used for email/username   */
/* ------------------------------------------------------------------ */
const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */
export const sportTypeEnum = pgEnum("sport_type", [
  "basketball",
  "pickleball",
  "tennis",
  "soccer",
  "volleyball",
]);
export const gameSideEnum = pgEnum("game_side", ["a", "b"]);
export const feedPostTypeEnum = pgEnum("feed_post_type", [
  "check_in",
  "note",
  "game_result",
]);
export const scheduledGameStatusEnum = pgEnum("scheduled_game_status", [
  "scheduled",
  "cancelled",
  "completed",
]);
export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "waitlist",
  "declined",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);
export const billingProviderEnum = pgEnum("billing_provider", [
  "app_store",
  "play_store",
  "stripe",
  "promo",
  "unknown",
]);

/* ------------------------------------------------------------------ */
/* courts                                                              */
/* ------------------------------------------------------------------ */
export const courtsTable = pgTable(
  "courts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    address: text("address").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    sportType: sportTypeEnum("sport_type").notNull().default("basketball"),
    addedBy: uuid("added_by").references(() => authUsers.id),
    imageUrl: text("image_url"),
    verificationThreshold: integer("verification_threshold")
      .notNull()
      .default(5),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    location: text("location"),
    state: text("state"),
  },
  (table) => [
    check(
      "courts_name_length",
      sql`char_length(btrim(${table.name})) >= 1 AND char_length(btrim(${table.name})) <= 120`,
    ),
    check(
      "courts_address_length",
      sql`char_length(btrim(${table.address})) >= 1 AND char_length(btrim(${table.address})) <= 250`,
    ),
    check(
      "courts_latitude_range",
      sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`,
    ),
    check(
      "courts_longitude_range",
      sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
    ),
    check(
      "courts_verification_threshold_range",
      sql`${table.verificationThreshold} >= 1 AND ${table.verificationThreshold} <= 100`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* profiles                                                            */
/* ------------------------------------------------------------------ */
export const profilesTable = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id),
    email: citext("email"),
    displayName: text("display_name").notNull(),
    username: citext("username").notNull().unique(),
    avatarUrl: text("avatar_url"),
    eloRating: integer("elo_rating").notNull().default(1200),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    totalCourtTimeMinutes: integer("total_court_time_minutes")
      .notNull()
      .default(0),
    applePrivateEmail: boolean("apple_private_email").notNull().default(false),
    pushNotificationsEnabled: boolean("push_notifications_enabled")
      .notNull()
      .default(true),
    checkInRemindersEnabled: boolean("check_in_reminders_enabled")
      .notNull()
      .default(true),
    gameAlertsEnabled: boolean("game_alerts_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    localCourtId: uuid("local_court_id").references(() => courtsTable.id),
  },
  (table) => [
    check(
      "profiles_display_name_length",
      sql`char_length(btrim(${table.displayName})) >= 1 AND char_length(btrim(${table.displayName})) <= 80`,
    ),
    check(
      "profiles_username_format",
      sql`${table.username} ~ '^[A-Za-z0-9_]{3,32}$'`,
    ),
    check("profiles_elo_rating_range", sql`${table.eloRating} >= 0 AND ${table.eloRating} <= 5000`),
    check("profiles_wins_nonnegative", sql`${table.wins} >= 0`),
    check("profiles_losses_nonnegative", sql`${table.losses} >= 0`),
    check(
      "profiles_court_time_nonnegative",
      sql`${table.totalCourtTimeMinutes} >= 0`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* check_ins                                                           */
/* ------------------------------------------------------------------ */
export const checkInsTable = pgTable(
  "check_ins",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courtsTable.id),
    note: text("note"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    visibility: text("visibility").default("public"),
  },
  (table) => [
    check("check_ins_note_length", sql`${table.note} IS NULL OR char_length(${table.note}) <= 280`),
    check(
      "check_ins_visibility_values",
      sql`${table.visibility} = ANY (ARRAY['public', 'friends', 'private'])`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* games                                                               */
/* ------------------------------------------------------------------ */
export const gamesTable = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courtsTable.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => authUsers.id),
    playedAt: timestamp("played_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    scoreA: integer("score_a").notNull(),
    scoreB: integer("score_b").notNull(),
    winnerSide: gameSideEnum("winner_side").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    check("games_score_a_nonnegative", sql`${table.scoreA} >= 0`),
    check("games_score_b_nonnegative", sql`${table.scoreB} >= 0`),
    check(
      "games_notes_length",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 500`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* game_participants                                                   */
/* ------------------------------------------------------------------ */
export const gameParticipantsTable = pgTable(
  "game_participants",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => gamesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    teamSide: gameSideEnum("team_side").notNull(),
    displayOrder: smallint("display_order").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.userId] }),
    check("game_participants_display_order_positive", sql`${table.displayOrder} > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* feed_posts                                                          */
/* ------------------------------------------------------------------ */
export const feedPostsTable = pgTable(
  "feed_posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authUsers.id),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courtsTable.id),
    gameId: uuid("game_id").references(() => gamesTable.id),
    postType: feedPostTypeEnum("post_type").notNull().default("note"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    check(
      "feed_posts_content_length",
      sql`char_length(btrim(${table.content})) >= 1 AND char_length(btrim(${table.content})) <= 500`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* feed_post_likes                                                     */
/* ------------------------------------------------------------------ */
export const feedPostLikesTable = pgTable(
  "feed_post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => feedPostsTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

/* ------------------------------------------------------------------ */
/* game_likes                                                          */
/* ------------------------------------------------------------------ */
export const gameLikesTable = pgTable(
  "game_likes",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => gamesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.userId] })],
);

/* ------------------------------------------------------------------ */
/* game_comments                                                       */
/* ------------------------------------------------------------------ */
export const gameCommentsTable = pgTable(
  "game_comments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    gameId: uuid("game_id")
      .notNull()
      .references(() => gamesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    check(
      "game_comments_body_length",
      sql`char_length(btrim(${table.body})) >= 1 AND char_length(btrim(${table.body})) <= 1000`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* scheduled_games                                                     */
/* ------------------------------------------------------------------ */
export const scheduledGamesTable = pgTable(
  "scheduled_games",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courtsTable.id),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => authUsers.id),
    title: text("title").notNull(),
    note: text("note"),
    startTime: timestamp("start_time", { withTimezone: true }),
    maxPlayers: integer("max_players").notNull(),
    isOpenInvite: boolean("is_open_invite").notNull().default(true),
    status: scheduledGameStatusEnum("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    check(
      "scheduled_games_title_length",
      sql`char_length(btrim(${table.title})) >= 3 AND char_length(btrim(${table.title})) <= 80`,
    ),
    check(
      "scheduled_games_note_length",
      sql`${table.note} IS NULL OR char_length(${table.note}) <= 500`,
    ),
    check(
      "scheduled_games_max_players_range",
      sql`${table.maxPlayers} >= 2 AND ${table.maxPlayers} <= 20`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* scheduled_game_participants                                         */
/* ------------------------------------------------------------------ */
export const scheduledGameParticipantsTable = pgTable(
  "scheduled_game_participants",
  {
    scheduledGameId: uuid("scheduled_game_id")
      .notNull()
      .references(() => scheduledGamesTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    rsvpStatus: rsvpStatusEnum("rsvp_status").notNull().default("going"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    primaryKey({ columns: [table.scheduledGameId, table.userId] }),
  ],
);

/* ------------------------------------------------------------------ */
/* friendships                                                         */
/* ------------------------------------------------------------------ */
export const friendshipsTable = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    requesterId: uuid("requester_id").references(() => authUsers.id),
    addresseeId: uuid("addressee_id").references(() => authUsers.id),
    status: text("status").default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`,
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(
      sql`now()`,
    ),
  },
  (table) => [
    check(
      "friendships_status_values",
      sql`${table.status} = ANY (ARRAY['pending', 'accepted', 'blocked'])`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* subscriptions                                                       */
/* ------------------------------------------------------------------ */
export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id),
  revenuecatAppUserId: text("revenuecat_app_user_id").notNull(),
  originalAppUserId: text("original_app_user_id"),
  productId: text("product_id"),
  entitlementId: text("entitlement_id"),
  status: subscriptionStatusEnum("status").notNull().default("inactive"),
  billingProvider: billingProviderEnum("billing_provider")
    .notNull()
    .default("app_store"),
  willRenew: boolean("will_renew"),
  currentPeriodStartsAt: timestamp("current_period_starts_at", {
    withTimezone: true,
  }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", {
    withTimezone: true,
  }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  rawPayload: jsonb("raw_payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/* ------------------------------------------------------------------ */
/* subscription_events                                                 */
/* ------------------------------------------------------------------ */
export const subscriptionEventsTable = pgTable("subscription_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(
    () => subscriptionsTable.id,
  ),
  userId: uuid("user_id").references(() => authUsers.id),
  eventType: text("event_type").notNull(),
  eventPayload: jsonb("event_payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
