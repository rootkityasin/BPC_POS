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
  await prisma.dishIngredient.deleteMany();
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
    update: {
      location: "Dhaka, Bangladesh",
      vatNumber: "VAT-DHK-001",
      vatPercentage: 5
    },
    create: {
      code: "DHK-001",
      nameEn: "BPC Dhaka",
      nameBn: "",
      location: "Dhaka, Bangladesh",
      vatNumber: "VAT-DHK-001",
      vatPercentage: 5
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
        update: { nameBn: "", color: cat.color, icon: cat.icon, displayOrder: i + 1 },
        create: {
          storeId: store.id,
          nameEn: cat.nameEn,
          nameBn: "",
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
        update: { nameBn: "", displayOrder: i + 1 },
        create: {
          storeId: store.id,
          categoryId: category.id,
          nameEn: sub.nameEn,
          nameBn: "",
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
          nameBn: "",
          categoryId: category.id,
          subCategoryId: subCategory.id,
          price: dishData.price
      },
        create: {
          storeId: store.id,
          categoryId: category.id,
          subCategoryId: subCategory.id,
          nameEn: dishData.nameEn,
          nameBn: "",
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
    { name: "Rice", quantity: 14, supplier: "Parking pizza", createdBy: "Jane Cooper", buyingPrice: 30, price: 40 },
    { name: "Bread", quantity: 10, supplier: "Sushi shop", createdBy: "Jane Cooper", buyingPrice: 15, price: 20 },
    { name: "Oats", quantity: 16, supplier: "Mayura", createdBy: "Jane Cooper", buyingPrice: 25, price: 35 },
    { name: "Quinoa", quantity: 7, supplier: "Foc i Oli", createdBy: "Jane Cooper", buyingPrice: 45, price: 60 },
    { name: "Barley", quantity: 24, supplier: "Sushi shop", createdBy: "Jane Cooper", buyingPrice: 20, price: null },
    { name: "Pasta", quantity: 20, supplier: "Torpedo", createdBy: "Jane Cooper", buyingPrice: 40, price: 55 },
    { name: "Corn", quantity: 28, supplier: "Como Kitchen", createdBy: "Jane Cooper", buyingPrice: 20, price: 30 },
    { name: "Millet", quantity: 18, supplier: "Gresca", createdBy: "Jane Cooper", buyingPrice: 22, price: null },
    { name: "Eggs", quantity: 2, supplier: "Parking pizza", createdBy: "Jane Cooper", buyingPrice: 10, price: 15 }
  ];

  for (const item of rawInventory) {
    await prisma.stockItem.create({
      data: {
        storeId: store.id,
        name: item.name,
        buyingPrice: item.buyingPrice,
        price: item.price,
        quantity: item.quantity,
        supplier: item.supplier,
        createdBy: item.createdBy
      }
    });
  }


  // Seed realistic POS orders across past 7 days (including today)
  const allDishes = await prisma.dish.findMany({
    where: { storeId: store.id }
  });

  if (allDishes.length > 0) {
    const customers = [
      { name: "Rafiqul Islam", phone: "01711234567" },
      { name: "Sadia Rahman", phone: "01819876543" },
      { name: "Tanvir Ahmed", phone: "01912345678" },
      { name: "Nusrat Jahan", phone: "01611122334" },
      { name: "Kamal Hossain", phone: "01511223344" },
      { name: "Mahmudul Hasan", phone: "01722334455" },
      { name: "Farhana Akter", phone: "01833445566" },
      { name: "Walk-in Guest", phone: null },
      { name: "Walk-in Guest", phone: null }
    ];

    const now = new Date();
    const bgTimeOffset = 6 * 60 * 60 * 1000;
    let invoiceSeq = 1001;

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const targetDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const year = targetDate.getUTCFullYear();
      const month = targetDate.getUTCMonth();
      const date = targetDate.getUTCDate();

      const mealSchedules = [
        { hours: [8, 9, 10], count: dayOffset === 0 ? 3 : 4 },
        { hours: [12, 13, 14], count: dayOffset === 0 ? 6 : 7 },
        { hours: [16, 17], count: dayOffset === 0 ? 3 : 4 },
        { hours: [19, 20, 21], count: dayOffset === 0 ? 4 : 5 }
      ];

      for (const schedule of mealSchedules) {
        for (let i = 0; i < schedule.count; i++) {
          const hour = schedule.hours[i % schedule.hours.length];
          const minute = (i * 17 + 10) % 60;
          const bdDate = new Date(Date.UTC(year, month, date, hour, minute, 0));
          const utcDate = new Date(bdDate.getTime() - bgTimeOffset);

          const currentBdHour = (now.getUTCHours() + 6) % 24;
          if (dayOffset === 0 && hour > currentBdHour) {
            continue;
          }

          const customer = customers[(invoiceSeq + i) % customers.length];
          const numItems = ((invoiceSeq + i) % 3) + 1;
          const items = [];
          let subtotal = 0;

          for (let it = 0; it < numItems; it++) {
            const dishIndex = (invoiceSeq + it + i) % allDishes.length;
            const dish = allDishes[dishIndex];
            const qty = ((invoiceSeq + it) % 2) + 1;
            const unitPrice = dish.price;
            const hasRefund = dayOffset > 0 && it === 0 && invoiceSeq % 7 === 0;
            const refundedQty = hasRefund ? 1 : 0;

            items.push({
              dishId: dish.id,
              itemName: dish.nameEn,
              quantity: qty,
              unitPrice: unitPrice,
              refundedQuantity: refundedQty
            });
            subtotal += qty * unitPrice;
          }

          const vatPercentage = 5;
          const vatAmount = Math.round((subtotal * vatPercentage) / 100);
          const totalAmount = subtotal + vatAmount;

          const createdOrder = await prisma.order.create({
            data: {
              storeId: store.id,
              invoiceNumber: `INV-${String(invoiceSeq).padStart(6, "0")}`,
              receiptPublicCode: `RCP-${String(invoiceSeq).padStart(6, "0")}`,
              customerName: customer.name,
              customerPhone: customer.phone,
              status: "COMPLETED",
              subtotalAmount: subtotal,
              vatPercentage: vatPercentage,
              vatAmount: vatAmount,
              vatNumber: "VAT-DHK-001",
              totalAmount: totalAmount,
              createdBy: "Cashier Terminal",
              createdAt: utcDate,
              updatedAt: utcDate
            }
          });

          for (const item of items) {
            await prisma.orderItem.create({
              data: {
                orderId: createdOrder.id,
                dishId: item.dishId,
                itemName: item.itemName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                refundedQuantity: item.refundedQuantity,
                printStatus: "Printed"
              }
            });
          }

          invoiceSeq++;
        }
      }
    }
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
