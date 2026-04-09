const { PrismaClient, RoleCode, NotificationType, NotificationSeverity } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const managerDefaults = [
  { key: "ORDERS", canView: true, canManage: true },
  { key: "STOCK", canView: true, canManage: true },
  { key: "CATEGORY", canView: true, canManage: false },
  { key: "SUBCATEGORY", canView: true, canManage: false },
  { key: "DISHES", canView: true, canManage: false },
  { key: "DEVICE_SETTINGS", canView: true, canManage: true },
  { key: "CUSTOMERS", canView: false, canManage: false },
  { key: "REPORTS", canView: false, canManage: false },
  { key: "EXPENSES", canView: false, canManage: false },
  { key: "USERS", canView: false, canManage: false },
  { key: "STORE_SETTINGS", canView: false, canManage: false },
  { key: "POS", canView: true, canManage: true },
  { key: "NOTIFICATIONS", canView: true, canManage: false }
];

const categories = [
  { nameEn: "Rice", nameBn: "ভাত", color: "#FF6B35", icon: "Rice" },
  { nameEn: "Biryani", nameBn: "বিরিয়ানি", color: "#F7C548", icon: "Bowl" },
  { nameEn: "Drinks", nameBn: "পানীয়", color: "#4ECDC4", icon: "Cup" },
  { nameEn: "Appetizers", nameBn: "স্টার্টার", color: "#95E1D3", icon: "Spoon" },
  { nameEn: "Desserts", nameBn: "মিষ্টি", color: "#DDA0DD", icon: "Cake" },
  { nameEn: "BBQ", nameBn: "বিবিকিউ", color: "#FF4757", icon: "Flame" }
];

const subCategories = {
  "Rice": [
    { nameEn: "Fried Rice", nameBn: "ফ্রাইড রাইস" },
    { nameEn: "Plain Rice", nameBn: "প্লেইন রাইস" },
    { nameEn: "Pulao", nameBn: "পোলাও" }
  ],
  "Biryani": [
    { nameEn: "Chicken Biryani", nameBn: "চিকেন বিরিয়ানি" },
    { nameEn: "Beef Biryani", nameBn: "গরু বিরিয়ানি" },
    { nameEn: "Mutton Biryani", nameBn: "খাসি বিরিয়ানি" }
  ],
  "Drinks": [
    { nameEn: "Soft Drinks", nameBn: "সফট ড্রিংকস" },
    { nameEn: "Lassi", nameBn: "লাসি" },
    { nameEn: "Water", nameBn: "পানি" }
  ],
  "Appetizers": [
    { nameEn: "Spring Rolls", nameBn: "স্প্রিং রোল" },
    { nameEn: "Chicken Wings", nameBn: "চিকেন উইংস" },
    { nameEn: "Fried Fries", nameBn: "ফ্রাইড ফ্রাইস" }
  ],
  "Desserts": [
    { nameEn: "Kulfi", nameBn: "কুলফি" },
    { nameEn: "Rasgulla", nameBn: "রসগোল্লা" },
    { nameEn: "Gulab Jamun", nameBn: "গুলাব জামুন" }
  ],
  "BBQ": [
    { nameEn: "Chicken Tikka", nameBn: "চিকেন টিকা" },
    { nameEn: "Seekh Kebab", nameBn: "সিখ কাবাব" },
    { nameEn: "Malai Kebab", nameBn: "মালাই কাবাব" }
  ]
};

const dishes = [
  { nameEn: "Chicken Fried Rice", nameBn: "চিকেন ফ্রাইড রাইস", price: 280, category: "Rice", subCategory: "Fried Rice", serves: 1, bowls: 1 },
  { nameEn: "Egg Fried Rice", nameBn: "এগ ফ্রাইড রাইস", price: 250, category: "Rice", subCategory: "Fried Rice", serves: 1, bowls: 1 },
  { nameEn: "Vegetable Fried Rice", nameBn: "ভেগিটেবল ফ্রাইড রাইস", price: 220, category: "Rice", subCategory: "Fried Rice", serves: 1, bowls: 1 },
  { nameEn: "Chicken Biryani", nameBn: "চিকেন বিরিয়ানি", price: 350, category: "Biryani", subCategory: "Chicken Biryani", serves: 1, bowls: 1 },
  { nameEn: "Beef Biryani", nameBn: "গরু বিরিয়ানি", price: 400, category: "Biryani", subCategory: "Beef Biryani", serves: 1, bowls: 1 },
  { nameEn: "Mutton Biryani", nameBn: "খাসি বিরিয়ানি", price: 450, category: "Biryani", subCategory: "Mutton Biryani", serves: 1, bowls: 1 },
  { nameEn: "Coca Cola", nameBn: "কোকা কোলা", price: 30, category: "Drinks", subCategory: "Soft Drinks", serves: 1, bowls: 1 },
  { nameEn: "Pepsi", nameBn: "পেপসি", price: 30, category: "Drinks", subCategory: "Soft Drinks", serves: 1, bowls: 1 },
  { nameEn: "Mango Lassi", nameBn: "আম লাসি", price: 80, category: "Drinks", subCategory: "Lassi", serves: 1, bowls: 1 },
  { nameEn: "Spring Rolls (4pcs)", nameBn: "স্প্রিং রোল (৪ পিস)", price: 150, category: "Appetizers", subCategory: "Spring Rolls", serves: 1, bowls: 1 },
  { nameEn: "Chicken Wings (4pcs)", nameBn: "চিকেন উইংস (৪ পিস)", price: 200, category: "Appetizers", subCategory: "Chicken Wings", serves: 1, bowls: 1 },
  { nameEn: "French Fries", nameBn: "ফ্রেঞ্চ ফ্রাইস", price: 120, category: "Appetizers", subCategory: "Fried Fries", serves: 1, bowls: 1 },
  { nameEn: "Kulfi (2pcs)", nameBn: "কুলফি (২ পিস)", price: 100, category: "Desserts", subCategory: "Kulfi", serves: 1, bowls: 1 },
  { nameEn: "Rasgulla (4pcs)", nameBn: "রসগোল্লা (৪ পিস)", price: 80, category: "Desserts", subCategory: "Rasgulla", serves: 1, bowls: 1 },
  { nameEn: "Gulab Jamun (4pcs)", nameBn: "গুলাব জামুন (৪ পিস)", price: 90, category: "Desserts", subCategory: "Gulab Jamun", serves: 1, bowls: 1 },
  { nameEn: "Chicken Tikka", nameBn: "চিকেন টিকা", price: 280, category: "BBQ", subCategory: "Chicken Tikka", serves: 2, bowls: 1 },
  { nameEn: "Seekh Kebab", nameBn: "সিখ কাবাব", price: 320, category: "BBQ", subCategory: "Seekh Kebab", serves: 2, bowls: 1 },
  { nameEn: "Malai Kebab", nameBn: "মালাই কাবাব", price: 350, category: "BBQ", subCategory: "Malai Kebab", serves: 2, bowls: 1 }
];

async function main() {
  const [superAdminRole, managerRole] = await Promise.all([
    prisma.role.upsert({
      where: { code: RoleCode.SUPER_ADMIN },
      update: { name: "Super Admin" },
      create: { code: RoleCode.SUPER_ADMIN, name: "Super Admin", description: "Full system access" }
    }),
    prisma.role.upsert({
      where: { code: RoleCode.MANAGER },
      update: { name: "Manager" },
      create: { code: RoleCode.MANAGER, name: "Manager", description: "Store operations manager" }
    })
  ]);

  const store = await prisma.store.upsert({
    where: { code: "DHK-001" },
    update: {},
    create: {
      code: "DHK-001",
      nameEn: "BPC Dhaka",
      nameBn: "বিপিসি ঢাকা"
    }
  });

  const terminal = await prisma.terminal.upsert({
    where: { code: "TERM-001" },
    update: {},
    create: {
      code: "TERM-001",
      name: "Main Counter",
      storeId: store.id,
      printerConnection: "LAN",
      printerTarget: "192.168.0.120"
    }
  });

  const hashedPassword = await bcrypt.hash("password123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@bpc.local" },
    update: { roleId: superAdminRole.id, storeId: store.id, passwordHash: hashedPassword },
    create: {
      email: "admin@bpc.local",
      name: "System Admin",
      passwordHash: hashedPassword,
      roleId: superAdminRole.id,
      storeId: store.id
    }
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@bpc.local" },
    update: { roleId: managerRole.id, storeId: store.id, passwordHash: hashedPassword },
    create: {
      email: "manager@bpc.local",
      name: "Store Manager",
      passwordHash: hashedPassword,
      roleId: managerRole.id,
      storeId: store.id
    }
  });

  await Promise.all(
    managerDefaults.map((permission) =>
      prisma.userPermissionOverride.upsert({
        where: {
          userId_key: {
            userId: manager.id,
            key: permission.key
          }
        },
        update: permission,
        create: {
          userId: manager.id,
          ...permission
        }
      })
    )
  );

  const createdCategories = {};
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const category = await prisma.category.upsert({
      where: { storeId_nameEn: { storeId: store.id, nameEn: cat.nameEn } },
      update: { nameBn: cat.nameBn, color: cat.color, icon: cat.icon, displayOrder: i + 1 },
      create: {
        storeId: store.id,
        nameEn: cat.nameEn,
        nameBn: cat.nameBn,
        color: cat.color,
        icon: cat.icon,
        displayOrder: i + 1
      }
    });
    createdCategories[cat.nameEn] = category;
  }

  const createdSubCategories = {};
  for (const [catName, subCats] of Object.entries(subCategories)) {
    const category = createdCategories[catName];
    if (!category) continue;
    
    for (let i = 0; i < subCats.length; i++) {
      const sub = subCats[i];
      const subCategory = await prisma.subCategory.upsert({
        where: { storeId_categoryId_nameEn: { storeId: store.id, categoryId: category.id, nameEn: sub.nameEn } },
        update: { nameBn: sub.nameBn, displayOrder: i + 1 },
        create: {
          storeId: store.id,
          categoryId: category.id,
          nameEn: sub.nameEn,
          nameBn: sub.nameBn,
          displayOrder: i + 1
        }
      });
      createdSubCategories[`${catName}:${sub.nameEn}`] = subCategory;
    }
  }

  for (let i = 0; i < dishes.length; i++) {
    const dishData = dishes[i];
    const category = createdCategories[dishData.category];
    const subCategory = createdSubCategories[`${dishData.category}:${dishData.subCategory}`];
    
    if (!category || !subCategory) continue;
    
    const sku = `DISH-${String(i + 1).padStart(3, '0')}`;
    const dish = await prisma.dish.upsert({
      where: { sku },
      update: {
        nameEn: dishData.nameEn,
        nameBn: dishData.nameBn,
        categoryId: category.id,
        subCategoryId: subCategory.id,
        price: dishData.price
      },
      create: {
        storeId: store.id,
        categoryId: category.id,
        subCategoryId: subCategory.id,
        nameEn: dishData.nameEn,
        nameBn: dishData.nameBn,
        sku,
        price: dishData.price,
        isAvailable: true
      }
    });

    const stockLevel = Math.floor(Math.random() * 3) + 1;
    await prisma.stockItem.upsert({
      where: { storeId_dishId: { storeId: store.id, dishId: dish.id } },
      update: { quantity: stockLevel * 10, lowStockLevel: 5 },
      create: {
        storeId: store.id,
        dishId: dish.id,
        quantity: stockLevel * 10,
        lowStockLevel: 5
      }
    });
  }

  await prisma.notification.create({
    data: {
      storeId: store.id,
      userId: superAdmin.id,
      title: "System initialized",
      message: `Terminal ${terminal.name} is ready for use.`,
      type: NotificationType.DEVICE_ALERT,
      severity: NotificationSeverity.INFO,
      audience: "SUPER_ADMIN"
    }
  }).catch(() => null);

  console.log("Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });