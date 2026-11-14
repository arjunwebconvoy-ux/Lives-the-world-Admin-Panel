import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';
import './styles/app.css';

import { signInWithGoogle, signOutAdmin, testFirestoreConnection } from './firebase';
import { initAuthObserver, state, subscribe, toggleTheme } from './store';
import { bindShellEvents, renderOverlaysHtml, renderShell } from './components/shell';
import { bindDashboardEvents, renderDashboardView } from './views/dashboard';
import { bindDestinationsEvents, renderDestinationsView } from './views/destinations';
import { bindPackagesEvents, renderPackagesView } from './views/packages';
import { bindBookingsEvents, renderBookingsView } from './views/bookings';
import { bindCustomersEvents, renderCustomersView } from './views/customers';
import { bindEnquiriesEvents, renderEnquiriesView } from './views/enquiries';
import { bindTransportEvents, renderTransportView } from './views/transportation';
import { bindContentEvents, renderContentView } from './views/content';
import { bindMarketingEvents, renderMarketingView } from './views/marketing';
import { bindUsersEvents, renderUsersView } from './views/users';
import { bindSettingsEvents, renderSettingsView } from './views/settings';
import { escapeHtml } from './utils/format';

const rootEl = document.getElementById('app') as HTMLElement;
rootEl.innerHTML = `<div id="app-view"></div><div id="app-overlays">${renderOverlaysHtml()}</div>`;
const viewEl = document.getElementById('app-view') as HTMLElement;

function renderLoginScreen(): string {
  const brandName =
    state.settings.find((s) => s.group === 'general')?.siteName ||
    state.settings.find((s) => s.group === 'website')?.siteName ||
    'Live The World';
  const brandInitials =
    brandName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'LW';

  return `
    <div class="ltw-auth-bg d-flex align-items-center justify-content-center p-3 p-sm-4">
      <div class="ltw-card p-4 p-md-5 shadow-sm" style="max-width: 440px; width: 100%;">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <div class="d-flex align-items-center gap-3">
            <div class="ltw-brand-mark" style="width: 44px; height: 44px; font-size: 18px;">${escapeHtml(brandInitials)}</div>
            <div>
              <h5 class="mb-0 fw-bold font-display">${escapeHtml(brandName)}</h5>
              <div class="small text-muted">Travel & Tourism Admin Panel</div>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="authThemeBtn" title="Toggle theme">
            <i class="bi ${state.theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}"></i>
          </button>
        </div>

        <h4 class="fw-bold mb-2">Administrator Sign In</h4>
        <p class="small text-muted mb-4">
          Sign in with your authorized Google account to manage Himalayan destinations, tour packages, customer bookings, fleet logistics, and website content.
        </p>

        <button type="button" class="btn btn-ltw w-100 py-2 d-flex align-items-center justify-content-center gap-2" id="googleSignInBtn">
          <i class="bi bi-google"></i>
          <span>Sign in with Google</span>
        </button>

        <div id="authErrorMsg" class="alert alert-danger small mt-3 mb-0 d-none"></div>

        <div class="border-top mt-4 pt-3 small text-muted">
          <div>Headquarters: The Mall Road, Near Ridge, Shimla, HP</div>
          <div>Protected by Firebase Auth & Role-Based Firestore Security</div>
        </div>
      </div>
    </div>
  `;
}

function renderAccessDeniedScreen(): string {
  const email = state.firebaseUser?.email || 'Unknown user';
  return `
    <div class="ltw-auth-bg d-flex align-items-center justify-content-center p-4">
      <div class="ltw-card p-4 p-md-5 shadow-sm" style="max-width: 460px; width: 100%;">
        <div class="d-flex align-items-center gap-2 text-danger mb-3">
          <i class="bi bi-shield-exclamation fs-4"></i>
          <h5 class="mb-0 fw-bold">Administrator Access Required</h5>
        </div>
        <p class="small text-secondary mb-3">
          You are signed in as <strong>${escapeHtml(email)}</strong>, which is not currently listed as an active Live The World administrator.
        </p>
        <p class="small text-muted mb-4">
          Ask your Super Admin to invite this email under <strong>User Management → Admin Users</strong>, or sign in with an authorized administrator account.
        </p>
        <button type="button" class="btn btn-outline-danger w-100" id="deniedSignOutBtn">
          <i class="bi bi-box-arrow-left me-1"></i>Sign Out & Switch Account
        </button>
      </div>
    </div>
  `;
}

function renderActiveRouteView(): string {
  const r = state.activeRoute;
  if (r.startsWith('dashboard-')) return renderDashboardView(r);
  if (r.startsWith('destinations-')) return renderDestinationsView(r);
  if (r.startsWith('packages-')) return renderPackagesView(r);
  if (r.startsWith('bookings-')) return renderBookingsView(r);
  if (r.startsWith('customers-')) return renderCustomersView(r);
  if (r.startsWith('enquiries-')) return renderEnquiriesView(r);
  if (r.startsWith('transport-')) return renderTransportView(r);
  if (r.startsWith('cms-')) return renderContentView(r);
  if (r.startsWith('marketing-')) return renderMarketingView(r);
  if (r.startsWith('users-')) return renderUsersView(r);
  if (r.startsWith('settings-')) return renderSettingsView(r);
  return renderDashboardView('dashboard-overview');
}

function bindActiveRouteEvents(): void {
  const r = state.activeRoute;
  if (r.startsWith('dashboard-')) bindDashboardEvents(viewEl, r);
  else if (r.startsWith('destinations-')) bindDestinationsEvents(viewEl, r);
  else if (r.startsWith('packages-')) bindPackagesEvents(viewEl, r);
  else if (r.startsWith('bookings-')) bindBookingsEvents(viewEl);
  else if (r.startsWith('customers-')) bindCustomersEvents(viewEl, r);
  else if (r.startsWith('enquiries-')) bindEnquiriesEvents(viewEl, r);
  else if (r.startsWith('transport-')) bindTransportEvents(viewEl);
  else if (r.startsWith('cms-')) bindContentEvents(viewEl, r);
  else if (r.startsWith('marketing-')) bindMarketingEvents(viewEl, r);
  else if (r.startsWith('users-')) bindUsersEvents(viewEl, r);
  else if (r.startsWith('settings-')) bindSettingsEvents(viewEl);
}

function render(): void {
  if (!state.authReady) {
    viewEl.innerHTML = `
      <div class="ltw-auth-bg d-flex align-items-center justify-content-center">
        <div class="text-center">
          <div class="spinner-border text-secondary mb-3" role="status"></div>
          <div class="small text-muted">Connecting to Live The World Operations...</div>
        </div>
      </div>
    `;
    return;
  }

  if (!state.firebaseUser) {
    viewEl.innerHTML = renderLoginScreen();
    viewEl.querySelector('#authThemeBtn')?.addEventListener('click', toggleTheme);
    viewEl.querySelector('#googleSignInBtn')?.addEventListener('click', async () => {
      const btn = viewEl.querySelector('#googleSignInBtn') as HTMLButtonElement;
      const errBox = viewEl.querySelector('#authErrorMsg') as HTMLElement;
      btn.disabled = true;
      errBox.classList.add('d-none');
      try {
        await signInWithGoogle();
      } catch (err) {
        errBox.textContent = err instanceof Error ? err.message : 'Google Sign-In cancelled or failed.';
        errBox.classList.remove('d-none');
        btn.disabled = false;
      }
    });
    return;
  }

  if (state.accessDenied || !state.adminProfile) {
    viewEl.innerHTML = renderAccessDeniedScreen();
    viewEl.querySelector('#deniedSignOutBtn')?.addEventListener('click', () => signOutAdmin());
    return;
  }

  // Clean up any orphaned mobile offcanvas backdrop before replacing #app-view
  document.querySelectorAll('.offcanvas-backdrop').forEach((el) => el.remove());
  if (!document.querySelector('.modal.show')) {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // Preserve input focus & caret across live filter re-renders
  const activeEl = document.activeElement as HTMLInputElement | null;
  const isInsideView = activeEl ? viewEl.contains(activeEl) : false;
  const activeId = isInsideView ? activeEl?.id || '' : '';
  const selStart = isInsideView && activeEl && 'selectionStart' in activeEl ? activeEl.selectionStart : null;
  const selEnd = isInsideView && activeEl && 'selectionEnd' in activeEl ? activeEl.selectionEnd : null;

  const brandName = state.settings.find((s) => s.group === 'general')?.siteName || 'Live The World';
  document.title = `${brandName} — Admin Panel`;

  const contentHtml = renderActiveRouteView();
  viewEl.innerHTML = renderShell(contentHtml);
  bindShellEvents(viewEl);
  bindActiveRouteEvents();

  if (activeId) {
    const restored = viewEl.querySelector<HTMLInputElement>(`#${CSS.escape(activeId)}`);
    if (restored) {
      restored.focus();
      if (selStart !== null && selEnd !== null && restored.setSelectionRange) {
        try {
          restored.setSelectionRange(selStart, selEnd);
        } catch {
          // ignore non-text inputs
        }
      }
    }
  }
}

subscribe(render);
testFirestoreConnection();
initAuthObserver();
render();
