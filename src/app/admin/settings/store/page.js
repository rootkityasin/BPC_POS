import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { getStoreSetup } from "@/modules/settings/settings-service";
import { StoreManagementClient } from "./store-management-client";

export default async function StoreSettingsPage({ searchParams }) {
  const user = await requireFeatureView(FEATURE_KEYS.STORE_SETTINGS);
  const selectedStoreId = searchParams?.storeId || user.storeId || null;
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
