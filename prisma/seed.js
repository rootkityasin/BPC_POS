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
  { nameEn: "Break Fast", nameBn: "Breakfast", color: "#cc0000", icon: "Coffee" },
  { nameEn: "Lunch", nameBn: "Lunch", color: "#0055ff", icon: "Bowl" },
  { nameEn: "Meal", nameBn: "Meal", color: "#cc0000", icon: "Package" },
  { nameEn: "Dinner", nameBn: "Dinner", color: "#8b4513", icon: "Utensils" }
];

const subCategories = {
  "Break Fast": [
    { nameEn: "Breakfast - 1", nameBn: "Porota, Vegetable, Egg" }
  ],
  "Lunch": [
    { nameEn: "Lunch Menu 1", nameBn: "Rice, Chicken, Salad" }
  ],
  "Dinner": [
    { nameEn: "Dinner Menu 2", nameBn: "Fried rice, Vegetable" }
  ],
  "Meal": [
    { nameEn: "Set Meal 1", nameBn: "Standard set meal" }
  ]
};

const dishes = [
  { nameEn: "Standard Breakfast", nameBn: "স্ট্যান্ডার্ড ব্রেকফাস্ট", price: 150, category: "Break Fast", subCategory: "Breakfast - 1", serves: 1, bowls: 1 },
  { nameEn: "Lunch Platter", nameBn: "লাঞ্চ প্লাটার", price: 350, category: "Lunch", subCategory: "Lunch Menu 1", serves: 1, bowls: 1 },
  { nameEn: "Dinner Platter", nameBn: "ডিনার প্লাটার", price: 400, category: "Dinner", subCategory: "Dinner Menu 2", serves: 1, bowls: 1 },
  { nameEn: "Standard Meal", nameBn: "স্ট্যান্ডার্ড মিল", price: 250, category: "Meal", subCategory: "Set Meal 1", serves: 1, bowls: 1 }
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  
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

  const rawInventory = [
    { name: "Rice", quantity: 14, supplier: "Parking pizza", createdBy: "Jane Cooper" },
    { name: "Bread", quantity: 10, supplier: "Sushi shop", createdBy: "Jane Cooper" },
    { name: "Oats", quantity: 16, supplier: "Mayura", createdBy: "Jane Cooper" },
    { name: "Quinoa", quantity: 7, supplier: "Foc i Oli", createdBy: "Jane Cooper" },
    { name: "Barley", quantity: 24, supplier: "Sushi shop", createdBy: "Jane Cooper" },
    { name: "Pasta", quantity: 20, supplier: "Torpedo", createdBy: "Jane Cooper" },
    { name: "Corn", quantity: 28, supplier: "Como Kitchen", createdBy: "Jane Cooper" },
    { name: "Millet", quantity: 18, supplier: "Gresca", createdBy: "Jane Cooper" },
    { name: "Eggs", quantity: 2, supplier: "Parking pizza", createdBy: "Jane Cooper" }
  ];

  for (const item of rawInventory) {
    await prisma.stockItem.create({
      data: {
        storeId: store.id,
        name: item.name,
        quantity: item.quantity,
        supplier: item.supplier,
        createdBy: item.createdBy
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