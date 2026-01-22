import {
  pgTable,
  text,
  serial,
  timestamp,
  decimal,
  integer,
  boolean,
  date,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

// ========================================
// Auth.js 관련 테이블
// ========================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// ========================================
// 앱 관련 테이블
// ========================================

// 카테고리 타입 enum
export const categoryTypeEnum = pgEnum("category_type", ["INCOME", "EXPENSE"]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  type: categoryTypeEnum("type").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null이면 시스템 기본 카테고리
  order: integer("order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 거래 타입 enum
export const transactionTypeEnum = pgEnum("transaction_type", [
  "INCOME",
  "EXPENSE",
]);

// 결제 수단 enum
export const paymentMethodEnum = pgEnum("payment_method", ["CARD", "CASH"]);

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  method: paymentMethodEnum("method").notNull(),
  date: date("date").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  memo: text("memo"),
  isFixed: boolean("is_fixed").notNull().default(false), // 고정 지출에서 자동 생성된 거래인지
  fixedExpenseId: integer("fixed_expense_id").references(
    () => fixedExpenses.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 고정 지출 타입 enum
export const fixedExpenseTypeEnum = pgEnum("fixed_expense_type", [
  "FIXED",
  "SAVING",
  "ETC",
]);

export const fixedExpenses = pgTable("fixed_expenses", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  scheduledDay: integer("scheduled_day").notNull(), // 1-31
  type: fixedExpenseTypeEnum("type").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  method: paymentMethodEnum("method").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  lastGeneratedMonth: text("last_generated_month"), // "YYYY-MM" 형식
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
