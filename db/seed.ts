import { db } from "./index";
import { categories } from "./schema";

async function seed() {
  try {
    // 기본 카테고리 데이터
    const defaultCategories = [
      // 수입 카테고리
      {
        name: "급여",
        icon: "💰",
        type: "INCOME" as const,
        order: 1,
        isDefault: true,
      },
      {
        name: "부수입",
        icon: "💵",
        type: "INCOME" as const,
        order: 2,
        isDefault: true,
      },
      {
        name: "용돈",
        icon: "🎁",
        type: "INCOME" as const,
        order: 3,
        isDefault: true,
      },
      {
        name: "기타수입",
        icon: "📈",
        type: "INCOME" as const,
        order: 4,
        isDefault: true,
      },

      // 지출 카테고리
      {
        name: "식비",
        icon: "🍔",
        type: "EXPENSE" as const,
        order: 1,
        isDefault: true,
      },
      {
        name: "교통",
        icon: "🚗",
        type: "EXPENSE" as const,
        order: 2,
        isDefault: true,
      },
      {
        name: "쇼핑",
        icon: "🛍️",
        type: "EXPENSE" as const,
        order: 3,
        isDefault: true,
      },
      {
        name: "문화/여가",
        icon: "🎬",
        type: "EXPENSE" as const,
        order: 4,
        isDefault: true,
      },
      {
        name: "의료/건강",
        icon: "🏥",
        type: "EXPENSE" as const,
        order: 5,
        isDefault: true,
      },
      {
        name: "교육",
        icon: "📚",
        type: "EXPENSE" as const,
        order: 6,
        isDefault: true,
      },
      {
        name: "통신비",
        icon: "📱",
        type: "EXPENSE" as const,
        order: 7,
        isDefault: true,
      },
      {
        name: "주거/관리",
        icon: "🏠",
        type: "EXPENSE" as const,
        order: 8,
        isDefault: true,
      },
      {
        name: "보험",
        icon: "🛡️",
        type: "EXPENSE" as const,
        order: 9,
        isDefault: true,
      },
      {
        name: "저축",
        icon: "🏦",
        type: "EXPENSE" as const,
        order: 10,
        isDefault: true,
      },
      {
        name: "기타지출",
        icon: "📊",
        type: "EXPENSE" as const,
        order: 11,
        isDefault: true,
      },
    ];

    console.log("📝 Inserting default categories...");
    await db.insert(categories).values(defaultCategories);

    console.log("✅ Seed completed successfully!");
    console.log(`   - Inserted ${defaultCategories.length} default categories`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }

  process.exit(0);
}

seed();
