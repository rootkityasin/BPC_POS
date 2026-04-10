import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { requireFeatureView } from "@/modules/rbac/access";
import { getStoreSetup } from "@/modules/settings/settings-service";
import { StoreManagementClient } from "./store-management-client";

export default async function StoreSettingsPage({ searchParams }) {
  const user = await requireFeatureView(FEATURE_KEYS.STORE_SETTINGS);
  const activeStoreId = await getActiveStoreId(user);
  const selectedStoreId = user.role === "SUPER_ADMIN"
    ? searchParams?.storeId || activeStoreId || null
    : activeStoreId;
  const { store, assignedManagers, managers, stores } = await getStoreSetup(user, selectedStoreId);

  return (
    <StoreManagementClient
      title="Store Setup"
      subtitle="Configure the store, VAT details, and manager assignments for this shop."
      stores={stores}
      selectedStore={store}
      assignedManagers={assignedManagers}
      managers={managers}
      showStoreList={false}
      createLink="/admin/settings/store/manage"
      manageLinkPrefix="/admin/settings/store"
      allowUserStoreFallback
    />
  );
}
