import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { requireFeatureView } from "@/modules/rbac/access";
import { getStoreSetup } from "@/modules/settings/settings-service";
import { StoreManagementClient } from "../store-management-client";

export default async function MultiStoreManagementPage({ searchParams }) {
  const user = await requireFeatureView(FEATURE_KEYS.STORE_SETTINGS);
  const activeStoreId = await getActiveStoreId(user);
  const selectedStoreId = user.role === "SUPER_ADMIN"
    ? searchParams?.storeId || activeStoreId || null
    : activeStoreId;
  const { store, assignedManagers, managers, stores } = await getStoreSetup(user, selectedStoreId, { allowUserStoreFallback: false });

  return (
    <StoreManagementClient
      title="Multi-Store Management"
      subtitle="Create stores, switch between locations, and manage manager assignments from one screen."
      stores={stores}
      selectedStore={store}
      assignedManagers={assignedManagers}
      managers={managers}
      showStoreList
      createLink={null}
      manageLinkPrefix="/admin/settings/store/manage"
      allowUserStoreFallback={false}
    />
  );
}
