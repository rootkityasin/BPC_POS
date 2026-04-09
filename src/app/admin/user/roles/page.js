import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { I18nText } from "@/components/i18n/i18n-text";
import { Fragment } from "react";
import { FEATURE_KEYS, buildPermissionMap } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { saveManagerOverrides } from "@/app/admin/user/roles/actions";

const permissionRows = [
  { label: "Orders", labelKey: "sidebar.orders", viewField: "viewOrders", manageField: "manageOrders", key: FEATURE_KEYS.ORDERS },
  { label: "Stock", labelKey: "sidebar.stock", viewField: "viewStock", manageField: "manageStock", key: FEATURE_KEYS.STOCK },
  { label: "Category", labelKey: "sidebar.category", viewField: "viewCategory", manageField: "manageCategory", key: FEATURE_KEYS.CATEGORY },
  { label: "Sub-Category", labelKey: "roles.subCategory", viewField: "viewSubCategory", manageField: "manageSubCategory", key: FEATURE_KEYS.SUBCATEGORY },
  { label: "Dishes", labelKey: "sidebar.dishes", viewField: "viewDishes", manageField: "manageDishes", key: FEATURE_KEYS.DISHES },
  { label: "Device Settings", labelKey: "sidebar.deviceSettings", viewField: "viewDeviceSettings", manageField: "manageDeviceSettings", key: FEATURE_KEYS.DEVICE_SETTINGS }
];

export default async function RolesPage() {
  await requireFeatureView(FEATURE_KEYS.USERS);
  const managers = await prisma.user.findMany({
    where: { role: { code: "MANAGER" } },
    include: { role: true, permissionOverrides: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900"><I18nText k="roles.title" fallback="Manage Roles" /></h2>
        <p className="text-sm text-slate-500"><I18nText k="roles.subtitle" fallback="Admin decides what each manager can see and update." /></p>
      </div>
      <div className="space-y-4">
        {managers.map((manager) => {
          const permissionMap = buildPermissionMap(manager.role.code, manager.permissionOverrides);
          return (
            <Card key={manager.id} className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">{manager.name}</h3>
                <p className="text-sm text-slate-500">{manager.email}</p>
              </div>
              <form action={saveManagerOverrides.bind(null, manager.id)} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="roles.feature" fallback="Feature" /></div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="roles.canView" fallback="Can View" /></div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="roles.canUpdate" fallback="Can Update" /></div>
                  {permissionRows.map((row) => (
                    <Fragment key={`${manager.id}-${row.key}`}>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"><I18nText k={row.labelKey} fallback={row.label} /></div>
                      <label className="flex items-center rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600"><input name={row.viewField} type="checkbox" defaultChecked={permissionMap[row.key]?.canView} className="mr-2" /><I18nText k="roles.view" fallback="View" /></label>
                      <label className="flex items-center rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600"><input name={row.manageField} type="checkbox" defaultChecked={permissionMap[row.key]?.canManage} className="mr-2" /><I18nText k="roles.update" fallback="Update" /></label>
                    </Fragment>
                  ))}
                </div>
                <Button type="submit"><I18nText k="roles.savePermissions" fallback="Save Permissions" /></Button>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
