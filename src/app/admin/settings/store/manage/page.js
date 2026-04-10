import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { getStoreSetup } from "@/modules/settings/settings-service";
import { StoreManagementClient } from "../store-management-client";

export default async function MultiStoreManagementPage({ searchParams }) {
  const user = await requireFeatureView(FEATURE_KEYS.STORE_SETTINGS);
  const selectedStoreId = searchParams?.storeId || null;
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
