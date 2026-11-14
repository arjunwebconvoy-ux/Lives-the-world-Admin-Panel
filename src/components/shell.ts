import { Offcanvas } from 'bootstrap';
import { signOutAdmin } from '../firebase';
import { navigateTo, state, toggleSidebarCollapsed, toggleTheme } from '../store';
import type { RouteKey } from '../types';
import { confirmDialog, escapeHtml, showToast } from '../utils/format';

export interface NavSubItem {
  route: RouteKey;
  label: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavSubItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'bi-grid-1x2',
    items: [
      { route: 'dashboard-overview', label: 'Overview' },
      { route: 'dashboard-analytics', label: 'Analytics' },
      { route: 'dashboard-reports', label: 'Reports' }
    ]
  },
  {
    id: 'destinations',
    label: 'Destination Management',
    icon: 'bi-geo-alt',
    items: [
      { route: 'destinations-manage', label: 'Manage Destinations' },
      { route: 'destinations-add', label: 'Add Destination' },
      { route: 'destinations-categories', label: 'Destination Categories' }
    ]
  },
  {
    id: 'packages',
    label: 'Tour & Package Management',
    icon: 'bi-compass',
    items: [
      { route: 'packages-manage', label: 'Manage Packages' },
      { route: 'packages-add', label: 'Add Tour Package' },
      { route: 'packages-pricing', label: 'Package Pricing' },
      { route: 'packages-itineraries', label: 'Tour Itineraries' },
      { route: 'packages-images', label: 'Package Images' }
    ]
  },
  {
    id: 'bookings',
    label: 'Booking Management',
    icon: 'bi-journal-check',
    items: [
      { route: 'bookings-all', label: 'All Bookings' },
      { route: 'bookings-pending', label: 'Pending Bookings' },
      { route: 'bookings-confirmed', label: 'Confirmed Bookings' },
      { route: 'bookings-cancelled', label: 'Cancelled Bookings' }
    ]
  },
  {
    id: 'customers',
    label: 'Customer Management',
    icon: 'bi-people',
    items: [
      { route: 'customers-all', label: 'All Customers' },
      { route: 'customers-add', label: 'Add Customer' },
      { route: 'customers-profiles', label: 'Customer Profiles & History' }
    ]
  },
  {
    id: 'enquiries',
    label: 'Enquiry Management',
    icon: 'bi-chat-left-text',
    items: [
      { route: 'enquiries-contact', label: 'Contact Form Enquiries' },
      { route: 'enquiries-tour', label: 'Tour Enquiries' },
      { route: 'enquiries-messages', label: 'Customer Messages' }
    ]
  },
  {
    id: 'transport',
    label: 'Transportation Management',
    icon: 'bi-truck-front',
    items: [
      { route: 'transport-vehicles', label: 'Manage Vehicles' },
      { route: 'transport-categories', label: 'Vehicle Categories & Seats' },
      { route: 'transport-pricing', label: 'Transportation Pricing' }
    ]
  },
  {
    id: 'cms',
    label: 'Content Management',
    icon: 'bi-layout-text-window-reverse',
    items: [
      { route: 'cms-homepage', label: 'Manage Homepage' },
      { route: 'cms-about', label: 'Manage About Us' },
      { route: 'cms-services', label: 'Manage Services' },
      { route: 'cms-gallery', label: 'Manage Gallery' },
      { route: 'cms-testimonials', label: 'Manage Testimonials' },
      { route: 'cms-faqs', label: 'Manage FAQs' },
      { route: 'cms-blog', label: 'Manage Blog Posts' }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing & SEO',
    icon: 'bi-megaphone',
    items: [
      { route: 'marketing-seo', label: 'Meta Titles & SEO' },
      { route: 'marketing-banners', label: 'Promotional Banners' },
      { route: 'marketing-social', label: 'Social Media Links' }
    ]
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'bi-shield-lock',
    items: [
      { route: 'users-admins', label: 'Admin Users' },
      { route: 'users-roles', label: 'Roles & Permissions' },
      { route: 'users-profile', label: 'Profile Management' }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'bi-sliders',
    items: [
      { route: 'settings-general', label: 'General Settings' },
      { route: 'settings-website', label: 'Website Settings' },
      { route: 'settings-email', label: 'Email Settings' },
      { route: 'settings-payment', label: 'Payment Settings' },
      { route: 'settings-security', label: 'Account & Security' }
    ]
  }
];

const expandedGroups = new Set<string>(['dashboard', 'bookings']);

function findActiveMeta(): { group: NavGroup; item: NavSubItem } {
  for (const g of NAV_GROUPS) {
    const found = g.items.find((it) => it.route === state.activeRoute);
    if (found) {
      expandedGroups.add(g.id);
      return { group: g, item: found };
    }
  }
  return { group: NAV_GROUPS[0], item: NAV_GROUPS[0].items[0] };
}

function renderSidebarNavHtml(isMobile = false): string {
  const { group: activeGroup } = findActiveMeta();

  return NAV_GROUPS.map((group) => {
    const isExpanded = expandedGroups.has(group.id) || group.id === activeGroup.id;
    const isActiveGroup = group.id === activeGroup.id;
    const subHtml = isExpanded
      ? `<div class="ltw-nav-sub">
          ${group.items
            .map(
              (item) => `
              <button
                type="button"
                class="ltw-nav-sub-btn ${state.activeRoute === item.route ? 'active' : ''}"
                data-route="${item.route}"
                ${isMobile ? 'data-mobile-nav="true"' : ''}
              >${escapeHtml(item.label)}</button>`
            )
            .join('')}
        </div>`
      : '';

    return `
      <div class="ltw-nav-group">
        <button
          type="button"
          class="ltw-nav-trigger ${isActiveGroup ? 'active-group' : ''}"
          data-group-toggle="${group.id}"
          data-default-route="${group.items[0].route}"
          title="${escapeHtml(group.label)}"
        >
          <span class="d-flex align-items-center gap-2 text-truncate">
            <i class="bi ${group.icon} fs-6 flex-shrink-0"></i>
            <span class="ltw-nav-label text-truncate">${escapeHtml(group.label)}</span>
          </span>
          <i class="bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} ltw-nav-caret small opacity-75"></i>
        </button>
        ${subHtml}
      </div>
    `;
  }).join('');
}

export function renderShell(contentHtml: string): string {
  const { group: activeGroup, item: activeItem } = findActiveMeta();
  const admin = state.adminProfile;
  const initials = (admin?.displayName || 'A')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const pendingEnquiries = state.enquiries.filter((e) => e.status === 'new').length;
  const pendingBookings = state.bookings.filter((b) => b.bookingStatus === 'pending').length;

  const generalSetting = state.settings.find((s) => s.group === 'general');
  const brandName = generalSetting?.siteName || 'Live The World';
  const brandInitials = brandName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'LW';

  return `
    <div class="ltw-shell">
      <!-- Desktop Sidebar -->
      <aside class="ltw-sidebar d-none d-lg-flex ${state.sidebarCollapsed ? 'collapsed' : ''}" aria-label="Primary sidebar">
        <div class="ltw-sidebar-brand">
          <div class="ltw-brand-mark">${escapeHtml(brandInitials)}</div>
          <div class="ltw-brand-text overflow-hidden">
            <div class="fw-bold text-white text-truncate font-display" style="font-size: 15px;">${escapeHtml(brandName)}</div>
            <div class="text-secondary text-truncate" style="font-size: 11px;">Travel Operations</div>
          </div>
        </div>
        <div class="ltw-sidebar-scroll">
          ${renderSidebarNavHtml(false)}
          <div class="mt-3 pt-3 border-top border-secondary border-opacity-25 px-1">
            <button type="button" class="ltw-nav-trigger text-danger-emphasis" id="sidebarLogoutBtn">
              <span class="d-flex align-items-center gap-2">
                <i class="bi bi-box-arrow-left fs-6"></i>
                <span class="ltw-nav-label">Logout</span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Mobile Offcanvas Sidebar -->
      <div class="offcanvas offcanvas-start bg-dark text-white d-lg-none" tabindex="-1" id="mobileSidebar" aria-labelledby="mobileSidebarLabel" style="width: 280px; background-color: var(--ltw-bg-sidebar) !important;">
        <div class="offcanvas-header border-bottom border-secondary border-opacity-25">
          <div class="d-flex align-items-center gap-2" id="mobileSidebarLabel">
            <div class="ltw-brand-mark">${escapeHtml(brandInitials)}</div>
            <div>
              <div class="fw-bold text-white font-display">${escapeHtml(brandName)}</div>
              <div class="text-secondary" style="font-size: 11px;">Admin Console</div>
            </div>
          </div>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body p-2">
          ${renderSidebarNavHtml(true)}
          <div class="mt-3 pt-3 border-top border-secondary border-opacity-25 px-1">
            <button type="button" class="ltw-nav-trigger text-danger-emphasis" id="mobileLogoutBtn">
              <span class="d-flex align-items-center gap-2">
                <i class="bi bi-box-arrow-left fs-6"></i>
                <span>Logout</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Workspace -->
      <div class="ltw-main">
        <header class="ltw-topbar">
          <div class="d-flex align-items-center gap-3 min-w-0">
            <button type="button" class="btn btn-sm btn-outline-secondary d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#mobileSidebar" aria-label="Open menu">
              <i class="bi bi-list fs-5"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary d-none d-lg-inline-flex" id="toggleSidebarBtn" aria-label="Toggle sidebar">
              <i class="bi ${state.sidebarCollapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'}"></i>
            </button>
            <nav aria-label="breadcrumb" class="min-w-0">
              <ol class="breadcrumb mb-0 small flex-nowrap">
                <li class="breadcrumb-item text-muted text-truncate d-none d-sm-inline">${escapeHtml(activeGroup.label)}</li>
                <li class="breadcrumb-item active fw-semibold text-truncate" aria-current="page">${escapeHtml(activeItem.label)}</li>
              </ol>
            </nav>
          </div>

          <div class="d-flex align-items-center gap-2 flex-shrink-0">
            ${
              pendingBookings > 0
                ? `<button type="button" class="btn btn-sm btn-outline-secondary d-none d-md-inline-flex align-items-center gap-1 whitespace-nowrap" data-route="bookings-pending">
                    <i class="bi bi-clock"></i>
                    <span>${pendingBookings} Pending</span>
                  </button>`
                : ''
            }
            ${
              pendingEnquiries > 0
                ? `<button type="button" class="btn btn-sm btn-outline-secondary d-none d-md-inline-flex align-items-center gap-1 whitespace-nowrap" data-route="enquiries-contact">
                    <i class="bi bi-envelope"></i>
                    <span>${pendingEnquiries} New Enquiries</span>
                  </button>`
                : ''
            }
            <button type="button" class="btn btn-sm btn-outline-secondary" id="themeToggleBtn" title="Switch light or dark theme" aria-label="Toggle theme">
              <i class="bi ${state.theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}"></i>
            </button>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                ${
                  admin?.photoUrl
                    ? `<img src="${escapeHtml(admin.photoUrl)}" alt="${escapeHtml(admin.displayName)}" class="ltw-avatar" style="width: 24px; height: 24px;" referrerpolicy="no-referrer" />`
                    : `<span class="ltw-avatar" style="width: 24px; height: 24px; font-size: 11px;">${escapeHtml(initials)}</span>`
                }
                <span class="d-none d-sm-inline text-truncate" style="max-width: 130px;">${escapeHtml(admin?.displayName || 'Admin')}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li class="px-3 py-2 border-bottom">
                  <div class="fw-semibold small">${escapeHtml(admin?.displayName || 'Admin')}</div>
                  <div class="text-muted" style="font-size: 12px;">${escapeHtml(admin?.email || '')}</div>
                  <div class="text-muted text-capitalize mt-1" style="font-size: 11px;">Role: ${escapeHtml((admin?.role || 'admin').replace(/_/g, ' '))}</div>
                </li>
                <li><button class="dropdown-item small" type="button" data-route="users-profile"><i class="bi bi-person me-2"></i>Profile Management</button></li>
                <li><button class="dropdown-item small" type="button" data-route="settings-general"><i class="bi bi-gear me-2"></i>General Settings</button></li>
                <li><hr class="dropdown-divider" /></li>
                <li><button class="dropdown-item small text-danger" type="button" id="topbarLogoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></li>
              </ul>
            </div>
          </div>
        </header>

        <main class="ltw-content">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;
}

export function renderOverlaysHtml(): string {
  return `
    <!-- Reusable Confirmation Modal -->
    <div class="modal fade" id="confirmActionModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header border-bottom">
            <h6 class="modal-title fw-semibold" id="confirmModalTitle">Confirm Action</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body small text-secondary" id="confirmModalBody"></div>
          <div class="modal-footer border-top">
            <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-sm btn-danger" id="confirmModalBtn">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusable Dynamic Workspace Modal -->
    <div class="modal fade" id="workspaceModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-fullscreen-sm-down modal-dialog-scrollable">
        <div class="modal-content" id="workspaceModalContent"></div>
      </div>
    </div>

    <!-- Toast Stack -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3 no-print" id="toast-container" style="z-index: 1090;"></div>
  `;
}

export function bindShellEvents(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-group-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.groupToggle;
      const defaultRoute = btn.dataset.defaultRoute as RouteKey | undefined;
      if (!groupId) return;
      if (state.sidebarCollapsed && defaultRoute) {
        expandedGroups.add(groupId);
        navigateTo(defaultRoute);
        return;
      }
      if (expandedGroups.has(groupId)) {
        expandedGroups.delete(groupId);
      } else {
        expandedGroups.add(groupId);
      }
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-route]').forEach((btn) => {
    const go = () => {
      const route = btn.dataset.route as RouteKey | undefined;
      if (!route) return;
      if (btn.dataset.mobileNav === 'true') {
        const offcanvasEl = document.getElementById('mobileSidebar');
        if (offcanvasEl) {
          Offcanvas.getOrCreateInstance(offcanvasEl).hide();
        }
      }
      navigateTo(route);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    btn.addEventListener('click', go);
    if (btn.tagName !== 'BUTTON' && btn.tagName !== 'A') {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });
    }
  });

  root.querySelector('#toggleSidebarBtn')?.addEventListener('click', () => {
    toggleSidebarCollapsed();
    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
  });
  root.querySelector('#themeToggleBtn')?.addEventListener('click', toggleTheme);

  const handleLogout = async () => {
    const ok = await confirmDialog({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of the Live The World Admin Panel?',
      confirmLabel: 'Logout',
      confirmVariant: 'danger'
    });
    if (!ok) return;
    await signOutAdmin();
    showToast('Signed out cleanly.', 'info');
  };

  root.querySelector('#sidebarLogoutBtn')?.addEventListener('click', handleLogout);
  root.querySelector('#mobileLogoutBtn')?.addEventListener('click', handleLogout);
  root.querySelector('#topbarLogoutBtn')?.addEventListener('click', handleLogout);
}
