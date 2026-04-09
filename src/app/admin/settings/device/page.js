import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { I18nText } from "@/components/i18n/i18n-text";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";
import { getDeviceSettings } from "@/modules/settings/settings-service";
import { saveDeviceSettings } from "@/app/admin/settings/device/actions";

export default async function DeviceSettingsPage() {
  const user = await requireFeatureView(FEATURE_KEYS.DEVICE_SETTINGS);
  const settings = await getDeviceSettings(user);
  const canEdit = hasManageAccess(user, FEATURE_KEYS.DEVICE_SETTINGS);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900"><I18nText k="device.title" fallback="Device Settings" /></h2>
        <p className="text-sm text-slate-500"><I18nText k="device.subtitle" fallback="Printer selection, receipt customization, and timezone. Managers can edit this area." /></p>
      </div>

      <form action={saveDeviceSettings} className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500"><I18nText k="device.selectPrinter" fallback="Select Printer" /></h3>
            <select name="printerTarget" defaultValue={settings?.printers?.[0]?.printerTarget || ""} disabled={!canEdit} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3">
              {settings?.printers?.map((printer) => (
                <option key={printer.id} value={printer.printerTarget || printer.name}>{printer.name} ({printer.printerConnection || <I18nText k="device.unknown" fallback="Unknown" />})</option>
              ))}
            </select>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500"><I18nText k="device.timezone" fallback="Timezone" /></h3>
            <select name="timezone" defaultValue={settings?.timezone || "Asia/Dhaka"} disabled={!canEdit} className="w-full rounded-xl border border-slate-200 px-4 py-3">
              <option value="Asia/Dhaka">Asia/Dhaka</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="UTC">UTC</option>
            </select>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500"><I18nText k="device.receiptControls" fallback="Receipt Controls" /></h3>
            <select name="receiptTheme" defaultValue={settings?.receiptTheme || "modern"} disabled={!canEdit} className="w-full rounded-xl border border-slate-200 px-4 py-3">
              <option value="modern">Modern</option>
              <option value="minimal">Minimal</option>
              <option value="classic">Classic</option>
            </select>
            <label className="block text-sm text-slate-600">
              <I18nText k="device.fontSize" fallback="Font Size" />
              <input name="receiptFontSize" type="number" min="10" max="18" defaultValue={settings?.receiptFontSize || 14} disabled={!canEdit} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="block text-sm text-slate-600">
              <I18nText k="device.watermarkOpacity" fallback="Watermark Opacity" />
              <input name="receiptWatermark" type="number" min="0" max="1" step="0.05" defaultValue={settings?.receiptWatermark || 0.1} disabled={!canEdit} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" />
            </label>
            <div className="grid gap-3 text-sm text-slate-600">
              <label><input name="receiptShowLogo" type="checkbox" defaultChecked={settings?.receiptShowLogo} disabled={!canEdit} className="mr-2" /><I18nText k="device.showLogo" fallback="Show Logo" /></label>
              <label><input name="receiptShowSeller" type="checkbox" defaultChecked={settings?.receiptShowSeller} disabled={!canEdit} className="mr-2" /><I18nText k="device.showSellerDetails" fallback="Show Seller Details" /></label>
              <label><input name="receiptShowBuyer" type="checkbox" defaultChecked={settings?.receiptShowBuyer} disabled={!canEdit} className="mr-2" /><I18nText k="device.showBuyerDetails" fallback="Show Buyer Details" /></label>
              <label><input name="receiptShowQr" type="checkbox" defaultChecked={settings?.receiptShowQr} disabled={!canEdit} className="mr-2" /><I18nText k="device.showQr" fallback="Show QR" /></label>
              <label><input name="receiptShowSign" type="checkbox" defaultChecked={settings?.receiptShowSign} disabled={!canEdit} className="mr-2" /><I18nText k="device.showSignatureArea" fallback="Show Signature Area" /></label>
            </div>
            {canEdit && <Button type="submit"><I18nText k="device.saveDeviceSettings" fallback="Save Device Settings" /></Button>}
          </Card>
        </div>

        <Card className="p-8">
          <h3 className="text-lg font-bold text-slate-900"><I18nText k="device.receiptPreview" fallback="Receipt Preview" /></h3>
          <div className="mt-6 max-w-lg rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8">
            <div className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"><I18nText k="device.theme" fallback="{{theme}} theme" values={{ theme: settings?.receiptTheme || "modern" }} /></div>
            <div className="mt-6 text-center text-xl font-black text-slate-900">BPC Dhaka</div>
            <div className="mt-2 text-center text-sm text-slate-500"><I18nText k="device.receiptSample" fallback="Receipt #INV-20260409-0001" /></div>
            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <div className="flex justify-between"><span>Chicken Fried Rice x2</span><span>560.00</span></div>
              <div className="flex justify-between"><span>Soft Drink x1</span><span>80.00</span></div>
               <div className="border-t border-slate-200 pt-3 font-bold"><div className="flex justify-between"><span><I18nText k="pos.total" fallback="Total:" /></span><span>640.00</span></div></div>
             </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
