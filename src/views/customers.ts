import { Modal } from 'bootstrap';
import { deleteCustomer, getCurrency, navigateTo, saveCustomer, state } from '../store';
import type { Customer, CustomerStatus, RouteKey } from '../types';
import {
  confirmDialog,
  escapeHtml,
  extractErrorMessage,
  formatCurrency,
  formatDate,
  paginate,
  renderPaginationHtml,
  renderStatusLabel,
  showToast
} from '../utils/format';
import { openBookingDetailModal } from './bookings';

let searchTerm = '';
let statusFilter = 'all';
let currentPage = 1;
let lastAddedCustomer: { id: string; fullName: string } | null = null;

interface CustomerDraft {
  fullName: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  city: string;
  country: string;
  notes: string;
}

function createEmptyCustomerDraft(): CustomerDraft {
  return {
    fullName: '',
    email: '',
    phone: '',
    status: 'active',
    city: '',
    country: 'India',
    notes: ''
  };
}

let addPageDraft: CustomerDraft = createEmptyCustomerDraft();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function renderCustomerFormFields(values: CustomerDraft): string {
  return `
    <div class="row g-3">
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="custFullNameInput">Full Name *</label>
        <input
          type="text"
          class="form-control"
          id="custFullNameInput"
          name="fullName"
          autocomplete="name"
          required
          minlength="2"
          maxlength="120"
          placeholder="e.g. Aarav Thakur"
          value="${escapeHtml(values.fullName)}"
        />
        <div class="invalid-feedback">Please enter the customer's full name (at least 2 characters).</div>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="custEmailInput">Email Address *</label>
        <input
          type="email"
          class="form-control"
          id="custEmailInput"
          name="email"
          inputmode="email"
          autocomplete="email"
          required
          minlength="5"
          maxlength="160"
          placeholder="e.g. aarav@example.com"
          value="${escapeHtml(values.email)}"
        />
        <div class="invalid-feedback">Please enter a valid email address.</div>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="custPhoneInput">Phone Number *</label>
        <input
          type="tel"
          class="form-control"
          id="custPhoneInput"
          name="phone"
          inputmode="tel"
          autocomplete="tel"
          required
          minlength="6"
          maxlength="30"
          placeholder="e.g. +91 98160 12345"
          value="${escapeHtml(values.phone)}"
        />
        <div class="invalid-feedback">Please enter a valid phone number (at least 6 characters).</div>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="custStatusSelect">Status *</label>
        <select class="form-select" id="custStatusSelect" name="status" required>
          <option value="active" ${values.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="vip" ${values.status === 'vip' ? 'selected' : ''}>VIP Traveler</option>
          <option value="inactive" ${values.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="custCityInput">City</label>
        <input
          type="text"
          class="form-control"
          id="custCityInput"
          name="city"
          autocomplete="address-level2"
          maxlength="100"
          placeholder="e.g. Chandigarh"
          value="${escapeHtml(values.city)}"
        />
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="custCountryInput">Country</label>
        <input
          type="text"
          class="form-control"
          id="custCountryInput"
          name="country"
          autocomplete="country-name"
          maxlength="100"
          placeholder="e.g. India"
          value="${escapeHtml(values.country)}"
        />
      </div>
      <div class="col-12">
        <label class="form-label small fw-semibold" for="custNotesInput">Travel Preferences / Notes</label>
        <textarea
          class="form-control"
          id="custNotesInput"
          name="notes"
          rows="3"
          maxlength="1000"
          placeholder="Preferred destinations, dietary requests, rooming or vehicle preferences"
        >${escapeHtml(values.notes)}</textarea>
      </div>
    </div>
  `;
}

function bindCustomerForm(
  container: HTMLElement,
  customer: Customer | undefined,
  options: {
    syncDraft?: boolean;
    onSuccess: (savedId: string, fullName: string) => void;
  }
): void {
  const isEdit = Boolean(customer);
  const form = container.querySelector('#customerForm') as HTMLFormElement | null;
  if (!form) return;

  if (options.syncDraft) {
    const syncFields = () => {
      const fd = new FormData(form);
      addPageDraft = {
        fullName: String(fd.get('fullName') || ''),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || ''),
        status: String(fd.get('status') || 'active') as CustomerStatus,
        city: String(fd.get('city') || ''),
        country: String(fd.get('country') || 'India'),
        notes: String(fd.get('notes') || '')
      };
    };
    form.addEventListener('input', syncFields);
    form.addEventListener('change', syncFields);
  }

  form.querySelectorAll<HTMLInputElement>('input').forEach((el) => {
    el.addEventListener('input', () => el.setCustomValidity(''));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = form.elements.namedItem('fullName') as HTMLInputElement | null;
    const emailEl = form.elements.namedItem('email') as HTMLInputElement | null;
    const phoneEl = form.elements.namedItem('phone') as HTMLInputElement | null;

    if (nameEl) {
      nameEl.setCustomValidity(nameEl.value.trim().length < 2 ? 'Full name must be at least 2 characters.' : '');
    }
    if (emailEl) {
      const emailVal = emailEl.value.trim();
      emailEl.setCustomValidity(
        emailVal.length < 5 || !EMAIL_PATTERN.test(emailVal) ? 'Please enter a valid email address.' : ''
      );
    }
    if (phoneEl) {
      phoneEl.setCustomValidity(phoneEl.value.trim().length < 6 ? 'Phone number must be at least 6 characters.' : '');
    }

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please complete all required customer fields.', 'warning');
      return;
    }

    const fd = new FormData(form);
    const btn = container.querySelector('#saveCustBtn') as HTMLButtonElement | null;
    const originalHtml = btn?.innerHTML || '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>${isEdit ? 'Saving...' : 'Creating...'}`;
    }

    const fullName = String(fd.get('fullName') || '').trim();
    try {
      const savedId = await saveCustomer({
        id: customer?.id,
        fullName,
        email: String(fd.get('email') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        city: String(fd.get('city') || '').trim(),
        country: String(fd.get('country') || 'India').trim() || 'India',
        status: String(fd.get('status') || 'active') as CustomerStatus,
        notes: String(fd.get('notes') || '').trim()
      });

      if (!isEdit) {
        searchTerm = '';
        statusFilter = 'all';
        currentPage = 1;
        addPageDraft = createEmptyCustomerDraft();
        lastAddedCustomer = { id: savedId, fullName };
      }
      options.onSuccess(savedId, fullName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(isEdit ? 'Customer profile updated.' : `Customer "${fullName}" added.`);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save customer'), 'danger');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  });
}

export function openCustomerModal(customer?: Customer): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const isEdit = Boolean(customer);
  const draft: CustomerDraft = customer
    ? {
        fullName: customer.fullName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        status: customer.status || 'active',
        city: customer.city || '',
        country: customer.country || 'India',
        notes: customer.notes || ''
      }
    : createEmptyCustomerDraft();

  contentEl.innerHTML = `
    <form id="customerForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? 'Edit Customer' : 'Add Customer'}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        ${renderCustomerFormFields(draft)}
      </div>
      <div class="modal-footer border-top">
        <div class="ltw-modal-actions d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-ltw" id="saveCustBtn">${isEdit ? 'Save Customer' : 'Create Customer'}</button>
        </div>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  bindCustomerForm(contentEl, customer, {
    onSuccess: () => {
      modal.hide();
      if (state.activeRoute === 'customers-add') {
        navigateTo('customers-all');
      }
    }
  });
}

function openCustomerHistoryModal(customerId: string): void {
  const c = state.customers.find((item) => item.id === customerId);
  if (!c) return;
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const currency = getCurrency();
  const history = state.bookings.filter((b) => b.customerId === c.id);
  const totalSpent = history.filter((b) => b.bookingStatus !== 'cancelled').reduce((acc, b) => acc + b.totalAmount, 0);

  contentEl.innerHTML = `
    <div class="modal-header border-bottom">
      <div class="min-w-0 pe-2">
        <h5 class="modal-title fw-bold mb-0 text-truncate">${escapeHtml(c.fullName)}</h5>
        <div class="small text-muted text-break">${escapeHtml(c.email)} · ${escapeHtml(c.phone)}</div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>
    <div class="modal-body">
      <div class="row g-3 mb-3">
        <div class="col-12 col-sm-4">
          <div class="p-3 rounded border h-100">
            <div class="small text-muted">Status</div>
            <div class="mt-1">${renderStatusLabel(c.status)}</div>
          </div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="p-3 rounded border h-100">
            <div class="small text-muted">Bookings</div>
            <div class="fs-5 fw-bold tabular-nums">${history.length}</div>
          </div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="p-3 rounded border h-100">
            <div class="small text-muted">Lifetime Spend</div>
            <div class="fs-5 fw-bold tabular-nums">${formatCurrency(totalSpent, currency)}</div>
          </div>
        </div>
      </div>
      ${c.notes ? `<div class="p-3 rounded border mb-3 small"><span class="text-muted fw-semibold">Notes:</span> ${escapeHtml(c.notes)}</div>` : ''}

      <h6 class="fw-semibold mb-2">Booking History</h6>
      <div class="table-responsive border rounded">
        <table class="table ltw-table mb-0">
          <thead>
            <tr>
              <th>Code</th>
              <th>Package</th>
              <th>Travel Date</th>
              <th>Status</th>
              <th class="text-end">Amount</th>
              <th class="text-end">Invoice</th>
            </tr>
          </thead>
          <tbody>
            ${
              history.length === 0
                ? `<tr><td colspan="6" class="text-center py-4 text-muted">No bookings recorded for this customer yet.</td></tr>`
                : history
                    .map(
                      (b) => `
                  <tr>
                    <td class="font-mono-num fw-semibold">${escapeHtml(b.bookingCode)}</td>
                    <td>${escapeHtml(b.packageTitle)}</td>
                    <td class="tabular-nums small">${escapeHtml(b.travelDate)}</td>
                    <td>${renderStatusLabel(b.bookingStatus)}</td>
                    <td class="text-end tabular-nums">${formatCurrency(b.totalAmount, currency)}</td>
                    <td class="text-end">
                      <button type="button" class="btn btn-sm btn-outline-secondary" data-history-booking="${escapeHtml(b.id)}">View</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer border-top">
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
    </div>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  contentEl.querySelectorAll<HTMLElement>('[data-history-booking]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.historyBooking;
      if (id) openBookingDetailModal(id);
    });
  });
}

export function renderCustomersView(route: RouteKey): string {
  const currency = getCurrency();

  if (route === 'customers-add') {
    const recentCustomers = state.customers.slice(0, 8);
    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Add Customer</h4>
          <p class="text-muted small mb-0">Register a traveler profile in Live The World for bookings and itinerary tracking.</p>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary ltw-mobile-full" id="backToAllCustBtn">
          <i class="bi bi-people me-1"></i>All Customers (${state.customers.length})
        </button>
      </div>

      <div class="ltw-card p-3 p-sm-4 mb-4">
        <form id="customerForm" novalidate>
          ${renderCustomerFormFields(addPageDraft)}
          <div class="d-grid d-sm-flex justify-content-sm-end gap-2 border-top pt-3 mt-4">
            <button type="button" class="btn btn-outline-secondary" id="resetAddCustBtn">Reset Form</button>
            <button type="submit" class="btn btn-ltw" id="saveCustBtn">
              <i class="bi bi-check2-circle me-1"></i>Create Customer
            </button>
          </div>
        </form>
      </div>

      <div class="ltw-card overflow-hidden">
        <div class="p-3 p-sm-4 border-bottom d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
          <div>
            <h6 class="fw-semibold mb-0">Recently Saved Customers (${state.customers.length} Total)</h6>
            <div class="small text-muted">New customers are validated on the backend and synced directly to Cloud Firestore.</div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary ltw-mobile-full" id="viewAllFromAddCustBtn">View All</button>
        </div>

        <div class="d-md-none">
          ${
            recentCustomers.length === 0
              ? `<div class="p-4 text-center text-muted small">No customers saved yet.</div>`
              : `<div class="divide-y">
                  ${recentCustomers
                    .map(
                      (c) => `
                    <div class="p-3 border-bottom">
                      <div class="d-flex align-items-start justify-content-between gap-2 mb-1">
                        <div class="d-flex align-items-center gap-2 min-w-0">
                          <span class="ltw-avatar">${escapeHtml(c.fullName.slice(0, 2).toUpperCase())}</span>
                          <div class="min-w-0">
                            <div class="fw-semibold text-truncate">${escapeHtml(c.fullName)}</div>
                            <div class="small text-muted text-truncate">${escapeHtml(c.city || '—')}, ${escapeHtml(c.country || 'India')}</div>
                          </div>
                        </div>
                        ${renderStatusLabel(c.status)}
                      </div>
                      <div class="small text-muted text-break mt-1">${escapeHtml(c.email)} · ${escapeHtml(c.phone)}</div>
                      <div class="small text-muted mt-1">Added: ${formatDate(c.createdAt)}</div>
                    </div>
                  `
                    )
                    .join('')}
                </div>`
          }
        </div>

        <div class="table-responsive d-none d-md-block">
          <table class="table ltw-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th class="text-end">Created</th>
              </tr>
            </thead>
            <tbody>
              ${
                recentCustomers.length === 0
                  ? `<tr><td colspan="5" class="text-center py-4 text-muted">No customers saved yet.</td></tr>`
                  : recentCustomers
                      .map(
                        (c) => `
                    <tr>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <span class="ltw-avatar">${escapeHtml(c.fullName.slice(0, 2).toUpperCase())}</span>
                          <span class="fw-semibold">${escapeHtml(c.fullName)}</span>
                        </div>
                      </td>
                      <td class="small">
                        <div>${escapeHtml(c.email)}</div>
                        <div class="text-muted">${escapeHtml(c.phone)}</div>
                      </td>
                      <td>${escapeHtml(c.city || '—')}, ${escapeHtml(c.country || 'India')}</td>
                      <td>${renderStatusLabel(c.status)}</td>
                      <td class="text-end small text-muted">${formatDate(c.createdAt)}</td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  const filtered = state.customers.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filterBarHtml = `
    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-12 col-sm-6">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="custSearchInput" placeholder="Search name, email, phone, or city..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-8 col-sm-4">
          <select class="form-select form-select-sm" id="custStatusFilter">
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="vip" ${statusFilter === 'vip' ? 'selected' : ''}>VIP Travelers</option>
            <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="col-4 col-sm-2 text-end small text-muted tabular-nums">${filtered.length} total</div>
      </div>
    </div>
  `;

  if (route === 'customers-profiles') {
    const pagedProfiles = paginate(filtered, currentPage, 9);
    currentPage = pagedProfiles.currentPage;

    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Customer Profiles & Booking History</h4>
          <p class="text-muted small mb-0">Inspect traveler preferences, VIP tiers, and lifetime spend.</p>
        </div>
        <button type="button" class="btn btn-sm btn-ltw ltw-mobile-full" id="addCustomerBtn"><i class="bi bi-plus-lg me-1"></i>Add Customer</button>
      </div>
      ${filterBarHtml}
      ${
        pagedProfiles.slice.length === 0
          ? `<div class="ltw-card p-5 text-center text-muted">No customer profiles match your search.</div>`
          : `<div class="row g-3">
              ${pagedProfiles.slice
                .map((c) => {
                  const custBookings = state.bookings.filter((b) => b.customerId === c.id);
                  const spent = custBookings.filter((b) => b.bookingStatus !== 'cancelled').reduce((acc, b) => acc + b.totalAmount, 0);
                  return `
                    <div class="col-12 col-md-6 col-xl-4">
                      <div class="ltw-card p-3 p-sm-4 h-100 d-flex flex-column justify-content-between">
                        <div>
                          <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                            <div class="d-flex align-items-center gap-2 min-w-0">
                              <span class="ltw-avatar">${escapeHtml(c.fullName.slice(0, 2).toUpperCase())}</span>
                              <div class="min-w-0">
                                <div class="fw-bold text-truncate">${escapeHtml(c.fullName)}</div>
                                <div class="small text-muted text-truncate">${escapeHtml(c.city || 'India')}, ${escapeHtml(c.country || 'India')}</div>
                              </div>
                            </div>
                            ${renderStatusLabel(c.status)}
                          </div>
                          <div class="small text-muted mt-2 text-break">${escapeHtml(c.email)} · ${escapeHtml(c.phone)}</div>
                          ${c.notes ? `<div class="small mt-2 text-secondary">${escapeHtml(c.notes)}</div>` : ''}
                        </div>
                        <div class="border-top pt-3 mt-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                          <div class="small tabular-nums"><strong>${custBookings.length}</strong> trips · <strong>${formatCurrency(spent, currency)}</strong></div>
                          <div class="d-flex gap-1">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-history-cust="${escapeHtml(c.id)}">History</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-cust="${escapeHtml(c.id)}" title="Edit"><i class="bi bi-pencil"></i></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>`
      }
      ${
        pagedProfiles.totalPages > 1
          ? `<div class="ltw-card p-3 mt-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span class="small text-muted">Page ${pagedProfiles.currentPage} of ${pagedProfiles.totalPages}</span>
              ${renderPaginationHtml(pagedProfiles.currentPage, pagedProfiles.totalPages, 'data-cust-page')}
            </div>`
          : ''
      }
    `;
  }

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  return `
    <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
      <div>
        <h4 class="mb-1 fw-bold">All Customers</h4>
        <p class="text-muted small mb-0">Manage registered travelers, contact records, and booking histories.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary flex-fill flex-sm-grow-0" id="goAddCustPageBtn">
          <i class="bi bi-person-plus me-1"></i>Full Form
        </button>
        <button type="button" class="btn btn-sm btn-ltw flex-fill flex-sm-grow-0" id="addCustomerBtn">
          <i class="bi bi-plus-lg me-1"></i>Add Customer
        </button>
      </div>
    </div>

    ${
      lastAddedCustomer
        ? `<div class="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between gap-2 mb-3" role="alert">
            <div class="small">
              <i class="bi bi-check-circle-fill me-2"></i>
              <strong>${escapeHtml(lastAddedCustomer.fullName)}</strong> was saved and appears at the top of your customer directory.
            </div>
            <button type="button" class="btn-close" id="dismissAddedCustAlert" aria-label="Close"></button>
          </div>`
        : ''
    }

    ${filterBarHtml}

    <div class="ltw-card overflow-hidden">
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Trips</th>
              <th class="text-end">Total Spent</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              paged.slice.length === 0
                ? `<tr><td colspan="7" class="text-center py-5 text-muted">No customers match your search.</td></tr>`
                : paged.slice
                    .map((c) => {
                      const trips = state.bookings.filter((b) => b.customerId === c.id);
                      const spent = trips.filter((b) => b.bookingStatus !== 'cancelled').reduce((acc, b) => acc + b.totalAmount, 0);
                      const isJustAdded = lastAddedCustomer?.id === c.id;
                      return `
                        <tr class="${isJustAdded ? 'table-success' : ''}">
                          <td>
                            <div class="d-flex align-items-center gap-2">
                              <span class="ltw-avatar">${escapeHtml(c.fullName.slice(0, 2).toUpperCase())}</span>
                              <div class="fw-semibold">${escapeHtml(c.fullName)}</div>
                            </div>
                          </td>
                          <td class="small">
                            <div>${escapeHtml(c.email)}</div>
                            <div class="text-muted">${escapeHtml(c.phone)}</div>
                          </td>
                          <td>${escapeHtml(c.city || '—')}, ${escapeHtml(c.country || 'India')}</td>
                          <td class="tabular-nums">${trips.length}</td>
                          <td class="text-end tabular-nums fw-semibold">${formatCurrency(spent, currency)}</td>
                          <td>${renderStatusLabel(c.status)}</td>
                          <td class="text-end text-nowrap">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-history-cust="${escapeHtml(c.id)}" title="Booking History">
                              <i class="bi bi-clock-history"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary ms-1" data-edit-cust="${escapeHtml(c.id)}" title="Edit">
                              <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-cust="${escapeHtml(c.id)}" title="Delete">
                              <i class="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
      ${
        paged.totalPages > 1
          ? `<div class="p-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span class="small text-muted">Page ${paged.currentPage} of ${paged.totalPages}</span>
              ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-cust-page')}
            </div>`
          : ''
      }
    </div>
  `;
}

export function bindCustomersEvents(root: HTMLElement, route: RouteKey = 'customers-all'): void {
  if (route === 'customers-add') {
    root.querySelector('#backToAllCustBtn')?.addEventListener('click', () => navigateTo('customers-all'));
    root.querySelector('#viewAllFromAddCustBtn')?.addEventListener('click', () => navigateTo('customers-all'));
    root.querySelector('#resetAddCustBtn')?.addEventListener('click', () => {
      addPageDraft = createEmptyCustomerDraft();
      import('../store').then((m) => m.emit());
    });
    bindCustomerForm(root, undefined, {
      syncDraft: true,
      onSuccess: () => {
        navigateTo('customers-all');
      }
    });
    return;
  }

  root.querySelector('#dismissAddedCustAlert')?.addEventListener('click', () => {
    lastAddedCustomer = null;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#goAddCustPageBtn')?.addEventListener('click', () => navigateTo('customers-add'));
  root.querySelector('#addCustomerBtn')?.addEventListener('click', () => openCustomerModal());

  root.querySelector('#custSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#custStatusFilter')?.addEventListener('change', (e) => {
    statusFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-cust-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.custPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-history-cust]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.historyCust;
      if (id) openCustomerHistoryModal(id);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-cust]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cust = state.customers.find((c) => c.id === btn.dataset.editCust);
      if (cust) openCustomerModal(cust);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-cust]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cust = state.customers.find((c) => c.id === btn.dataset.delCust);
      if (!cust) return;
      const ok = await confirmDialog({
        title: 'Delete Customer',
        message: `Remove "${cust.fullName}" from customer records?`,
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deleteCustomer(cust.id);
        if (lastAddedCustomer?.id === cust.id) lastAddedCustomer = null;
        showToast('Customer deleted.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete customer'), 'danger');
      }
    });
  });
}
