import { signOutAdmin } from '../firebase';
import { saveSetting, state } from '../store';
import type { RouteKey } from '../types';
import { confirmDialog, escapeHtml, extractErrorMessage, showToast } from '../utils/format';

export function renderSettingsView(route: RouteKey): string {
  const general = state.settings.find((s) => s.group === 'general');
  const website = state.settings.find((s) => s.group === 'website');
  const email = state.settings.find((s) => s.group === 'email');
  const payment = state.settings.find((s) => s.group === 'payment');

  const tabs = `
    <div class="d-flex flex-wrap gap-1 mb-4">
      <button type="button" class="btn btn-sm ${route === 'settings-general' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="settings-general">General</button>
      <button type="button" class="btn btn-sm ${route === 'settings-website' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="settings-website">Website</button>
      <button type="button" class="btn btn-sm ${route === 'settings-email' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="settings-email">Email / SMTP</button>
      <button type="button" class="btn btn-sm ${route === 'settings-payment' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="settings-payment">Payments</button>
      <button type="button" class="btn btn-sm ${route === 'settings-security' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="settings-security">Account & Security</button>
    </div>
  `;

  if (route === 'settings-website') {
    return `
      <div class="mb-3">
        <h4 class="mb-1 fw-bold">Website Settings</h4>
        <p class="text-muted small mb-0">Manage public website title, tagline, and maintenance state for livestheworld.com.</p>
      </div>
      ${tabs}
      <form id="websiteSettingsForm" class="ltw-card p-4" style="max-width: 760px;" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Public Brand Title *</label>
            <input type="text" class="form-control" name="siteName" required minlength="2" maxlength="120" value="${escapeHtml(website?.siteName || 'Live The World')}" />
            <div class="invalid-feedback">Please enter a public brand title.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Website Tagline</label>
            <input type="text" class="form-control" name="tagline" maxlength="200" value="${escapeHtml(website?.tagline || 'Explore Shimla, Manali, Kasol & Spiti Valley')}" />
          </div>
          <div class="col-12">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="maintSwitch" ${website?.maintenanceMode ? 'checked' : ''} />
              <label class="form-check-label small fw-semibold" for="maintSwitch">Enable Maintenance Mode on Public Site</label>
            </div>
          </div>
          <div class="col-12">
            <button type="submit" class="btn btn-ltw" id="saveWebsiteSettingsBtn">Save Website Settings</button>
          </div>
        </div>
      </form>
    `;
  }

  if (route === 'settings-email') {
    return `
      <div class="mb-3">
        <h4 class="mb-1 fw-bold">Email & Notification Settings</h4>
        <p class="text-muted small mb-0">Configure outbound SMTP server details for booking confirmations and enquiry alerts.</p>
      </div>
      ${tabs}
      <form id="emailSettingsForm" class="ltw-card p-4" style="max-width: 760px;" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">SMTP Host *</label>
            <input type="text" class="form-control" name="smtpHost" required maxlength="120" value="${escapeHtml(email?.smtpHost || 'smtp.gmail.com')}" />
            <div class="invalid-feedback">Please enter an SMTP host.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">SMTP Port *</label>
            <input type="number" class="form-control tabular-nums" name="smtpPort" required min="1" max="65535" value="${email?.smtpPort ?? 587}" />
            <div class="invalid-feedback">Enter a valid port (1–65535).</div>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Sender Email / SMTP User *</label>
            <input type="email" class="form-control" name="smtpUser" required maxlength="120" value="${escapeHtml(email?.smtpUser || 'livetheworld099@gmail.com')}" />
            <div class="invalid-feedback">Please enter a valid sender email address.</div>
          </div>
          <div class="col-12">
            <button type="submit" class="btn btn-ltw" id="saveEmailSettingsBtn">Save Email Settings</button>
          </div>
        </div>
      </form>
    `;
  }

  if (route === 'settings-payment') {
    return `
      <div class="mb-3">
        <h4 class="mb-1 fw-bold">Payment Gateway Settings</h4>
        <p class="text-muted small mb-0">Toggle accepted booking payment gateways and configure bank settlement details.</p>
      </div>
      ${tabs}
      <form id="paymentSettingsForm" class="ltw-card p-4" style="max-width: 760px;" novalidate>
        <div class="row g-3">
          <div class="col-sm-4">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="razorpayCheck" ${payment?.razorpayEnabled !== false ? 'checked' : ''} />
              <label class="form-check-label small fw-semibold" for="razorpayCheck">Razorpay Checkout</label>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="upiCheck" ${payment?.upiEnabled !== false ? 'checked' : ''} />
              <label class="form-check-label small fw-semibold" for="upiCheck">Direct UPI</label>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="stripeCheck" ${payment?.stripeEnabled ? 'checked' : ''} />
              <label class="form-check-label small fw-semibold" for="stripeCheck">Stripe International</label>
            </div>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Bank Transfer / Settlement Instructions</label>
            <textarea class="form-control" name="bankDetails" rows="3" maxlength="400">${escapeHtml(payment?.bankDetails || 'Live The World Travels · HDFC Bank Shimla')}</textarea>
          </div>
          <div class="col-12">
            <button type="submit" class="btn btn-ltw" id="savePaymentSettingsBtn">Save Payment Settings</button>
          </div>
        </div>
      </form>
    `;
  }

  if (route === 'settings-security') {
    const u = state.adminProfile;
    return `
      <div class="mb-3">
        <h4 class="mb-1 fw-bold">Account Security & Session</h4>
        <p class="text-muted small mb-0">Authentication is secured via Google Sign-In & Firebase Auth with verified email enforcement.</p>
      </div>
      ${tabs}
      <div class="ltw-card p-4" style="max-width: 760px;">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 pb-3 mb-3 border-bottom">
          <div>
            <div class="fw-semibold">Signed-In Google Account</div>
            <div class="small text-muted">${escapeHtml(u?.email || '')} · Role: ${escapeHtml((u?.role || '').replace(/_/g, ' '))}</div>
          </div>
          <span class="status-text status-success"><i class="bi bi-shield-check me-1"></i>Verified Session</span>
        </div>
        <p class="small text-secondary">
          Because this console uses Google Sign-In OAuth rather than local passwords, password changes and 2-Step Verification are managed directly in your Google Account security settings.
        </p>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-danger" id="settingsLogoutBtn">
            <i class="bi bi-box-arrow-left me-1"></i>Sign Out of Admin Panel
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="mb-3">
      <h4 class="mb-1 fw-bold">General Settings</h4>
      <p class="text-muted small mb-0">Primary business identity, Shimla office address, currency, and tax rate.</p>
    </div>
    ${tabs}
    <form id="generalSettingsForm" class="ltw-card p-4" style="max-width: 760px;" novalidate>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label small fw-semibold">Agency Name *</label>
          <input type="text" class="form-control" name="siteName" required minlength="2" maxlength="120" value="${escapeHtml(general?.siteName || 'Live The World')}" />
          <div class="invalid-feedback">Please enter an agency name.</div>
        </div>
        <div class="col-md-6">
          <label class="form-label small fw-semibold">Contact Email *</label>
          <input type="email" class="form-control" name="contactEmail" required maxlength="160" value="${escapeHtml(general?.contactEmail || 'livetheworld099@gmail.com')}" />
          <div class="invalid-feedback">Please enter a valid contact email.</div>
        </div>
        <div class="col-md-6">
          <label class="form-label small fw-semibold">Contact Phone *</label>
          <input type="text" class="form-control" name="contactPhone" required minlength="6" maxlength="40" value="${escapeHtml(general?.contactPhone || '+91 87640 44003')}" />
          <div class="invalid-feedback">Please enter a valid contact phone.</div>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small fw-semibold">Currency</label>
          <select class="form-select" name="currency">
            <option value="INR" ${general?.currency !== 'USD' ? 'selected' : ''}>INR (₹)</option>
            <option value="USD" ${general?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small fw-semibold">GST / Tax (%)</label>
          <input type="number" class="form-control tabular-nums" name="taxPercent" min="0" max="50" step="0.5" value="${general?.taxPercent ?? 5}" />
          <div class="invalid-feedback">Enter 0 to 50%.</div>
        </div>
        <div class="col-12">
          <label class="form-label small fw-semibold">Office Address *</label>
          <input type="text" class="form-control" name="address" required maxlength="300" value="${escapeHtml(general?.address || 'The Mall Road, Near Ridge, Shimla, Himachal Pradesh 171001')}" />
          <div class="invalid-feedback">Please enter the office address.</div>
        </div>
        <div class="col-12">
          <button type="submit" class="btn btn-ltw" id="saveGeneralSettingsBtn">Save General Settings</button>
        </div>
      </div>
    </form>
  `;
}

function validateAndFocus(form: HTMLFormElement): boolean {
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    const firstInvalid = form.querySelector<HTMLElement>(':invalid');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus({ preventScroll: true });
    }
    showToast('Please correct the highlighted settings fields.', 'warning');
    return false;
  }
  return true;
}

export function bindSettingsEvents(root: HTMLElement): void {
  root.querySelector('#generalSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (!validateAndFocus(form)) return;
    const fd = new FormData(form);
    const btn = form.querySelector('#saveGeneralSettingsBtn') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      await saveSetting({
        id: 'setting_general',
        group: 'general',
        siteName: String(fd.get('siteName')).trim(),
        contactEmail: String(fd.get('contactEmail')).trim(),
        contactPhone: String(fd.get('contactPhone')).trim(),
        currency: String(fd.get('currency')),
        taxPercent: Number(fd.get('taxPercent') || 5),
        address: String(fd.get('address')).trim()
      });
      showToast('General settings saved.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save settings'), 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  root.querySelector('#websiteSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (!validateAndFocus(form)) return;
    const fd = new FormData(form);
    const btn = form.querySelector('#saveWebsiteSettingsBtn') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      await saveSetting({
        id: 'setting_website',
        group: 'website',
        siteName: String(fd.get('siteName')).trim(),
        tagline: String(fd.get('tagline')).trim(),
        maintenanceMode: form.querySelector<HTMLInputElement>('#maintSwitch')?.checked ?? false
      });
      showToast('Website settings saved.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save settings'), 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  root.querySelector('#emailSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (!validateAndFocus(form)) return;
    const fd = new FormData(form);
    const btn = form.querySelector('#saveEmailSettingsBtn') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      await saveSetting({
        id: 'setting_email',
        group: 'email',
        smtpHost: String(fd.get('smtpHost')).trim(),
        smtpPort: Number(fd.get('smtpPort') || 587),
        smtpUser: String(fd.get('smtpUser')).trim()
      });
      showToast('Email settings saved.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save settings'), 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  root.querySelector('#paymentSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (!validateAndFocus(form)) return;
    const fd = new FormData(form);
    const btn = form.querySelector('#savePaymentSettingsBtn') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      await saveSetting({
        id: 'setting_payment',
        group: 'payment',
        razorpayEnabled: form.querySelector<HTMLInputElement>('#razorpayCheck')?.checked ?? true,
        upiEnabled: form.querySelector<HTMLInputElement>('#upiCheck')?.checked ?? true,
        stripeEnabled: form.querySelector<HTMLInputElement>('#stripeCheck')?.checked ?? false,
        bankDetails: String(fd.get('bankDetails') || '').trim()
      });
      showToast('Payment settings saved.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save settings'), 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  root.querySelector('#settingsLogoutBtn')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Sign Out',
      message: 'Sign out from your active Google Admin session?',
      confirmLabel: 'Sign Out'
    });
    if (!ok) return;
    await signOutAdmin();
    showToast('Signed out.', 'info');
  });
}
