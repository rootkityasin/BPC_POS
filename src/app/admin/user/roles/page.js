import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fragment } from "react";
import { FEATURE_KEYS, buildPermissionMap } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { saveManagerOverrides } from "@/app/admin/user/roles/actions";

const permissionRows = [
  { label: "Orders", viewField: "viewOrders", manageField: "manageOrders", key: FEATURE_KEYS.ORDERS },
  { label: "Stock", viewField: "viewStock", manageField: "manageStock", key: FEATURE_KEYS.STOCK },
  { label: "Category", viewField: "viewCategory", manageField: "manageCategory", key: FEATURE_KEYS.CATEGORY },
  { label: "Sub-Category", viewField: "viewSubCategory", manageField: "manageSubCategory", key: FEATURE_KEYS.SUBCATEGORY },
  { label: "Dishes", viewField: "viewDishes", manageField: "manageDishes", key: FEATURE_KEYS.DISHES },
  { label: "Device Settings", viewField: "viewDeviceSettings", manageField: "manageDeviceSettings", key: FEATURE_KEYS.DEVICE_SETTINGS }
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
        <h2 className="text-2xl font-black text-slate-900">Manage Roles</h2>
        <p className="text-sm text-slate-500">Admin decides what each manager can see and update.</p>
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
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Feature</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Can View</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Can Update</div>
                  {permissionRows.map((row) => (
                    <Fragment key={`${manager.id}-${row.key}`}>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">{row.label}</div>
                      <label className="flex items-center rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600"><input name={row.viewField} type="checkbox" defaultChecked={permissionMap[row.key]?.canView} className="mr-2" />View</label>
                      <label className="flex items-center rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600"><input name={row.manageField} type="checkbox" defaultChecked={permissionMap[row.key]?.canManage} className="mr-2" />Update</label>
                    </Fragment>
                  ))}
                </div>
                <Button type="submit">Save Permissions</Button>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
