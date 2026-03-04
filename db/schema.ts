import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  index,
  date,
  decimal,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// -------------------------------------------------------------------
// 1. Enums
// -------------------------------------------------------------------

// 거래 타입: 수입/지출/저축
export const transactionTypeEnum = pgEnum("transaction_type", [
  "INCOME",
  "EXPENSE",
  "SAVING",
]);

export const methodEnum = pgEnum("method_type", ["CARD", "CASH"]);

// 고정 지출 타입: SAVING 제거 (고정 저축은 fixedSavings로 처리)
export const fixedExpenseTypeEnum = pgEnum("fixed_expense_type", [
  "FIXED",
  "ETC",
]);

// 자산 타입
export const assetTypeEnum = pgEnum("asset_type", [
  "SAVINGS", // 예금
  "DEPOSIT", // 적금
  "STOCK", // 주식
  "FUND", // 펀드
  "CRYPTO", // 암호화폐
  "REAL_ESTATE", // 부동산
  "OTHER", // 기타
]);

// 자산 거래 타입
export const assetTransactionTypeEnum = pgEnum("asset_transaction_type", [
  "DEPOSIT", // 입금 (저축 이동)
  "WITHDRAW", // 출금
  "PROFIT", // 수익 (이자, 배당)
  "LOSS", // 손실
  "TRANSFER", // 이체 (자산 간 이동)
]);

// 카테고리 타입
export const categoryTypeEnum = pgEnum("category_type", [
  "INCOME",
  "EXPENSE",
  "SAVING",
]);

// -------------------------------------------------------------------
// 2. Auth Tables
// -------------------------------------------------------------------
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: uniqueIndex("account_provider_providerAccountId_idx").on(
      account.provider,
      account.providerAccountId,
    ),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: uniqueIndex("verificationToken_identifier_token_idx").on(
      vt.identifier,
      vt.token,
    ),
  }),
);

// -------------------------------------------------------------------
// 3. Core Domain Tables
// -------------------------------------------------------------------

// 목표 설정 (사용자당 활성 목표 1개만 허용)
export const goals = pgTable(
  "goal",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // 초기 자금
    initialAmount: decimal("initial_amount", { precision: 12, scale: 0 })
      .notNull()
      .default("0"),

    // 목표 금액 (기본값: 1억원)
    targetAmount: decimal("target_amount", { precision: 12, scale: 0 })
      .notNull()
      .default("100000000"),

    startDate: date("start_date", { mode: "string" }).notNull(),
    targetDate: date("target_date", { mode: "string" }),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("goal_user_idx").on(t.userId),
    // 사용자당 활성 목표 1개만 허용
    activeGoalIdx: uniqueIndex("goal_user_active_idx")
      .on(t.userId)
      .where(sql`is_active = true`),
  }),
);

// 카테고리
export const categories = pgTable(
  "category",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    type: categoryTypeEnum("type").notNull(),

    userId: text("userId").references(() => users.id, { onDelete: "cascade" }),

    order: integer("order").default(0).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userTypeIdx: index("category_user_type_idx").on(t.userId, t.type),
  }),
);

// 가계부 내역 (수입/지출/저축 모두 기록)
export const transactions = pgTable(
  "transaction",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    amount: decimal("amount", { precision: 12, scale: 0 }).notNull(),

    type: transactionTypeEnum("type").notNull(), // INCOME, EXPENSE, SAVING
    method: methodEnum("method"), // SAVING 타입은 null 허용

    date: date("date", { mode: "string" }).notNull(),

    categoryId: integer("categoryId").references(() => categories.id, {
      onDelete: "set null",
    }),

    memo: text("memo"),

    isFixed: boolean("is_fixed").default(false).notNull(),
    fixedExpenseId: integer("fixed_expense_id").references(
      () => fixedExpenses.id,
      {
        onDelete: "set null",
      },
    ),

    // SAVING 타입일 때 연결된 자산 거래
    linkedAssetTransactionId: integer("linked_asset_transaction_id").references(
      () => assetTransactions.id,
      { onDelete: "set null" },
    ),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userDateIdx: index("transaction_user_date_idx").on(t.userId, t.date),
    userMonthIdx: index("transaction_user_month_idx").on(t.userId, t.date),
    categoryIdx: index("transaction_category_idx").on(t.categoryId),
    linkedAssetTxIdx: index("transaction_linked_asset_tx_idx").on(
      t.linkedAssetTransactionId,
    ),
    fixedExpenseDateUniqueIdx: uniqueIndex("transaction_fixed_expense_date_idx")
      .on(t.fixedExpenseId, t.date)
      .where(sql`fixed_expense_id IS NOT NULL`),
  }),
);

// 고정 지출 설정 (저축은 fixedSavings로 분리)
export const fixedExpenses = pgTable(
  "fixed_expense",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    amount: decimal("amount", { precision: 12, scale: 0 }).notNull(),

    scheduledDay: integer("scheduled_day").notNull(),

    type: fixedExpenseTypeEnum("type").notNull(), // FIXED, ETC만

    categoryId: integer("categoryId").references(() => categories.id, {
      onDelete: "set null",
    }),

    method: methodEnum("method").default("CARD").notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),

    lastGeneratedMonth: text("last_generated_month"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("fixed_expense_user_idx").on(t.userId),
    activeIdx: index("fixed_expense_active_idx").on(
      t.isActive,
      t.lastGeneratedMonth,
    ),
  }),
);

// 자산 계좌
export const assets = pgTable(
  "asset",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    type: assetTypeEnum("type").notNull(),

    // 현재 잔액 (assetTransactions와 동기화 필요)
    balance: decimal("balance", { precision: 12, scale: 0 })
      .notNull()
      .default("0"),

    // 주식 예수금 (STOCK 타입에서만 사용, 매도 대금/이체 입금 시 증가)
    cashBalance: decimal("cash_balance", { precision: 12, scale: 0 })
      .notNull()
      .default("0"),

    institution: text("institution"), // 금융기관명
    accountNumber: text("account_number"), // 계좌번호

    interestRate: decimal("interest_rate", { precision: 5, scale: 2 }), // 이율

    icon: text("icon"),
    color: text("color"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("asset_user_idx").on(t.userId),
    userActiveIdx: index("asset_user_active_idx").on(t.userId, t.isActive),
  }),
);

// 자산 거래 내역 (저축 이동, 투자 매매, 이자 등)
export const assetTransactions = pgTable(
  "asset_transaction",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),

    amount: decimal("amount", { precision: 12, scale: 0 }).notNull(),
    type: assetTransactionTypeEnum("type").notNull(),

    date: date("date", { mode: "string" }).notNull(),
    memo: text("memo"),

    // 고정 저축에서 자동 생성된 거래인지
    isFixed: boolean("is_fixed").default(false).notNull(),
    fixedSavingId: integer("fixed_saving_id").references(
      () => fixedSavings.id,
      {
        onDelete: "set null",
      },
    ),

    // TRANSFER 타입일 때 목적지 자산
    toAssetId: integer("to_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userDateIdx: index("asset_transaction_user_date_idx").on(t.userId, t.date),
    assetIdx: index("asset_transaction_asset_idx").on(t.assetId),
    fixedSavingIdx: index("asset_transaction_fixed_saving_idx").on(
      t.fixedSavingId,
    ),
    fixedSavingDateUniqueIdx: uniqueIndex(
      "asset_transaction_fixed_saving_date_idx",
    )
      .on(t.fixedSavingId, t.date)
      .where(sql`fixed_saving_id IS NOT NULL`),
  }),
);

// 고정 저축 설정
export const fixedSavings = pgTable(
  "fixed_saving",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    amount: decimal("amount", { precision: 12, scale: 0 }).notNull(),

    scheduledDay: integer("scheduled_day").notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),

    lastGeneratedMonth: text("last_generated_month"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("fixed_saving_user_idx").on(t.userId),
    activeIdx: index("fixed_saving_active_idx").on(
      t.isActive,
      t.lastGeneratedMonth,
    ),
  }),
);

// -------------------------------------------------------------------
// 4. Relations
// -------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  transactions: many(transactions),
  fixedExpenses: many(fixedExpenses),
  categories: many(categories),
  goals: many(goals),
  assets: many(assets),
  assetTransactions: many(assetTransactions),
  fixedSavings: many(fixedSavings),
  stockHoldings: many(stockHoldings),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  fixedExpenses: many(fixedExpenses),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  fixedExpense: one(fixedExpenses, {
    fields: [transactions.fixedExpenseId],
    references: [fixedExpenses.id],
  }),
  linkedAssetTransaction: one(assetTransactions, {
    fields: [transactions.linkedAssetTransactionId],
    references: [assetTransactions.id],
  }),
}));

export const fixedExpensesRelations = relations(
  fixedExpenses,
  ({ one, many }) => ({
    user: one(users, {
      fields: [fixedExpenses.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [fixedExpenses.categoryId],
      references: [categories.id],
    }),
    generatedTransactions: many(transactions),
  }),
);

export const assetsRelations = relations(assets, ({ one, many }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
  transactions: many(assetTransactions, { relationName: "asset_transactions" }),
  incomingTransfers: many(assetTransactions, {
    relationName: "asset_transfers_to",
  }),
  fixedSavings: many(fixedSavings),
  stockHoldings: many(stockHoldings),
}));

export const assetTransactionsRelations = relations(
  assetTransactions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [assetTransactions.userId],
      references: [users.id],
    }),
    asset: one(assets, {
      relationName: "asset_transactions",
      fields: [assetTransactions.assetId],
      references: [assets.id],
    }),
    toAsset: one(assets, {
      relationName: "asset_transfers_to",
      fields: [assetTransactions.toAssetId],
      references: [assets.id],
    }),
    fixedSaving: one(fixedSavings, {
      fields: [assetTransactions.fixedSavingId],
      references: [fixedSavings.id],
    }),
    linkedTransactions: many(transactions),
  }),
);

export const fixedSavingsRelations = relations(
  fixedSavings,
  ({ one, many }) => ({
    user: one(users, {
      fields: [fixedSavings.userId],
      references: [users.id],
    }),
    asset: one(assets, {
      fields: [fixedSavings.assetId],
      references: [assets.id],
    }),
    generatedTransactions: many(assetTransactions),
  }),
);

// -------------------------------------------------------------------
// 5. Type Exports
// -------------------------------------------------------------------

// Enum Types
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type MethodType = (typeof methodEnum.enumValues)[number];
export type CategoryType = (typeof categoryTypeEnum.enumValues)[number];
export type FixedExpenseType = (typeof fixedExpenseTypeEnum.enumValues)[number];
export type AssetType = (typeof assetTypeEnum.enumValues)[number];
export type AssetTransactionType =
  (typeof assetTransactionTypeEnum.enumValues)[number];

// Table Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type NewFixedExpense = typeof fixedExpenses.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type AssetTransaction = typeof assetTransactions.$inferSelect;
export type NewAssetTransaction = typeof assetTransactions.$inferInsert;

export type FixedSaving = typeof fixedSavings.$inferSelect;
export type NewFixedSaving = typeof fixedSavings.$inferInsert;

// -------------------------------------------------------------------
// 6. Stock Tables
// -------------------------------------------------------------------

// 종목 마스터 (국내 + 해외, 모든 사용자 공유)
export const stockMaster = pgTable(
  "stock_master",
  {
    id: serial("id").primaryKey(),

    stockCode: text("stock_code").notNull(), // 005930, AAPL
    stockName: text("stock_name").notNull(), // 삼성전자, Apple Inc.
    stockNameEn: text("stock_name_en"), // 영문명
    market: text("market").notNull(), // KOSPI, KOSDAQ, NYSE, NASDAQ, AMEX
    country: text("country").notNull().default("KR"), // KR, US

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    codeMarketIdx: uniqueIndex("stock_master_code_market_idx").on(
      t.stockCode,
      t.market,
    ),
    nameIdx: index("stock_master_name_idx").on(t.stockName),
    countryIdx: index("stock_master_country_idx").on(t.country),
  }),
);

// 주식 시세 캐시 (모든 사용자 공유)
export const stockPrices = pgTable(
  "stock_price",
  {
    id: serial("id").primaryKey(),

    stockCode: text("stock_code").notNull(), // 005930, AAPL
    stockName: text("stock_name").notNull(), // 삼성전자, Apple Inc.
    market: text("market").notNull(), // KOSPI, KOSDAQ, NYSE, NASDAQ, AMEX
    country: text("country").notNull().default("KR"), // KR, US

    currentPrice: decimal("current_price", {
      precision: 12,
      scale: 2,
    }).notNull(), // 원화폐 단위 (KRW or USD)
    previousClose: decimal("previous_close", { precision: 12, scale: 2 }),
    changeRate: decimal("change_rate", { precision: 8, scale: 4 }),
    currency: text("currency").notNull().default("KRW"), // KRW, USD

    // KRW 환산가 (KRW 종목은 currentPrice와 동일, USD 종목은 currentPrice × exchangeRate)
    krwPrice: decimal("krw_price", { precision: 16, scale: 0 }),
    // 조회 시점 환율 (USD/KRW)
    exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }),

    priceDate: date("price_date", { mode: "string" }).notNull(), // 기준일 YYYY-MM-DD
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    stockCodeIdx: uniqueIndex("stock_price_code_idx").on(
      t.stockCode,
      t.country,
    ),
    priceDateIdx: index("stock_price_date_idx").on(t.priceDate),
  }),
);

// 사용자별 주식 보유 내역
export const stockHoldings = pgTable(
  "stock_holding",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // 연결된 자산 계좌 (NOT NULL: STOCK 타입 asset 먼저 생성 필수)
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),

    stockCode: text("stock_code").notNull(), // 005930, AAPL
    stockName: text("stock_name").notNull(), // 삼성전자, Apple Inc.
    country: text("country").notNull().default("KR"), // KR, US
    market: text("market").notNull().default("KOSPI"), // KOSPI, KOSDAQ, NYSE, NASDAQ, AMEX

    // 미국 소수점 주식(fractional shares) 지원: 최대 소수 6자리
    quantity: decimal("quantity", { precision: 12, scale: 6 }).notNull(),
    avgPrice: decimal("avg_price", { precision: 12, scale: 2 }).notNull(), // 평단가 (원화폐 단위)
    currency: text("currency").notNull().default("KRW"), // KRW, USD

    memo: text("memo"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("stock_holding_user_idx").on(t.userId),
    stockCodeIdx: index("stock_holding_stock_code_idx").on(t.stockCode),
    userStockIdx: uniqueIndex("stock_holding_user_stock_idx").on(
      t.userId,
      t.assetId,
      t.stockCode,
      t.country,
    ),
  }),
);

// -------------------------------------------------------------------
// 7. Stock Relations
// -------------------------------------------------------------------

export const stockMasterRelations = relations(stockMaster, ({}) => ({}));

export const stockPricesRelations = relations(stockPrices, ({}) => ({}));

export const stockHoldingsRelations = relations(stockHoldings, ({ one }) => ({
  user: one(users, {
    fields: [stockHoldings.userId],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [stockHoldings.assetId],
    references: [assets.id],
  }),
}));

// -------------------------------------------------------------------
// 8. Stock Type Exports
// -------------------------------------------------------------------

export type StockMaster = typeof stockMaster.$inferSelect;
export type NewStockMaster = typeof stockMaster.$inferInsert;

export type StockPrice = typeof stockPrices.$inferSelect;
export type NewStockPrice = typeof stockPrices.$inferInsert;

export type StockHolding = typeof stockHoldings.$inferSelect;
export type NewStockHolding = typeof stockHoldings.$inferInsert;
