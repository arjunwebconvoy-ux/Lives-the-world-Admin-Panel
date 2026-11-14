import { Modal } from 'bootstrap';
import {
  deleteBooking,
  getCurrency,
  recordPaymentForBooking,
  saveBooking,
  state,
  updateBookingStatus
} from '../store';
import type { Booking, BookingStatus, PaymentMethod, PaymentStatus, RouteKey } from '../types';
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

let searchTerm = '';
let paymentFilter = 'all';
let currentPage = 1;

export function openBookingDetailModal(bookingId: string): void {
  const b = state.bookings.find((item) => item.id === bookingId);
  if (!b) return;
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const currency = getCurrency();
  const balance = Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.paidAmount) || 0));
  const payments = state.payments.filter((p) => p.bookingId === b.id);
  const gen = state.settings.find((s) => s.group === 'general');

  contentEl.innerHTML = `
    <div class="modal-header border-bottom no-print">
      <div>
        <h5 class="modal-title fw-bold mb-0">Booking Details & Invoice · <span class="font-mono-num">${escapeHtml(b.bookingCode)}</span></h5>
        <div class="small text-muted">Created ${formatDate(b.createdAt)}</div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>
    <div class="modal-body">
      <!-- Printable Invoice Header -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 pb-3 mb-3 border-bottom">
        <div>
          <div class="fw-bold fs-5 font-display">${escapeHtml(gen?.siteName || 'Live The World')}</div>
          <div class="small text-muted">${escapeHtml(gen?.address || 'The Mall Road, Near Ridge, Shimla, HP 171001')}</div>
          <div class="small text-muted">${escapeHtml(gen?.contactPhone || '+91 87640 44003')} · ${escapeHtml(gen?.contactEmail || 'livetheworld099@gmail.com')}</div>
        </div>
        <div class="text-md-end">
          <div class="small text-muted">Invoice / Reservation Ref</div>
          <div class="font-mono-num fw-bold fs-6">${escapeHtml(b.bookingCode)}</div>
          <div class="mt-1">${renderStatusLabel(b.bookingStatus)} · ${renderStatusLabel(b.paymentStatus)}</div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <div class="p-3 rounded border h-100">
            <div class="small text-muted fw-semibold mb-2">Customer Information</div>
            <div class="fw-semibold">${escapeHtml(b.customerName)}</div>
            <div class="small text-muted">${escapeHtml(b.customerEmail)}</div>
            <div class="small text-muted">${escapeHtml(b.customerPhone)}</div>
            <div class="small mt-2"><span class="text-muted">Travelers:</span> <strong>${b.adults} Adults, ${b.children} Children</strong></div>
            ${b.passengerDetails ? `<div class="small text-muted mt-1">${escapeHtml(b.passengerDetails)}</div>` : ''}
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 rounded border h-100">
            <div class="small text-muted fw-semibold mb-2">Trip & Fleet Details</div>
            <div class="fw-semibold">${escapeHtml(b.packageTitle)}</div>
            <div class="small text-muted">Destination: ${escapeHtml(b.destinationName)}</div>
            <div class="small mt-2 tabular-nums"><span class="text-muted">Travel Dates:</span> <strong>${escapeHtml(b.travelDate)} → ${escapeHtml(b.returnDate)}</strong></div>
            <div class="small mt-1"><span class="text-muted">Assigned Vehicle:</span> ${escapeHtml(b.vehicleName || 'Standard Transfer')}</div>
            ${b.specialRequests ? `<div class="small text-muted mt-1">Notes: ${escapeHtml(b.specialRequests)}</div>` : ''}
          </div>
        </div>
      </div>

      <div class="table-responsive border rounded mb-4">
        <table class="table ltw-table mb-0">
          <thead>
            <tr>
              <th>Line Item</th>
              <th>Method</th>
              <th class="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tour Package Total (${b.adults} Adults, ${b.children} Children)</td>
              <td>${escapeHtml(b.paymentMethod)}</td>
              <td class="text-end tabular-nums fw-semibold">${formatCurrency(b.totalAmount, currency)}</td>
            </tr>
            <tr>
              <td>Amount Paid</td>
              <td>${renderStatusLabel(b.paymentStatus)}</td>
              <td class="text-end tabular-nums text-success fw-semibold">${formatCurrency(b.paidAmount, currency)}</td>
            </tr>
            <tr>
              <td class="fw-bold">Remaining Balance Due</td>
              <td></td>
              <td class="text-end tabular-nums fw-bold ${balance > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(balance, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${
        payments.length > 0
          ? `<div class="mb-4">
              <div class="small fw-semibold text-muted mb-2">Recorded Transactions</div>
              <div class="table-responsive border rounded">
                <table class="table table-sm mb-0 small">
                  <thead><tr><th>Ref</th><th>Method</th><th>Date</th><th class="text-end">Amount</th></tr></thead>
                  <tbody>
                    ${payments
                      .map(
                        (p) => `
                      <tr>
                        <td class="font-mono-num">${escapeHtml(p.transactionRef || p.id)}</td>
                        <td>${escapeHtml(p.method)}</td>
                        <td>${formatDate(p.createdAt)}</td>
                        <td class="text-end tabular-nums">${formatCurrency(p.amount, currency)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>`
          : ''
      }

      <div class="p-3 rounded border no-print">
        <div class="small fw-semibold mb-2">Admin Actions — Update Status or Record Payment</div>
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label small text-muted mb-1">Booking Status</label>
            <select class="form-select form-select-sm" id="detailBookingStatus">
              <option value="pending" ${b.bookingStatus === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${b.bookingStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="completed" ${b.bookingStatus === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${b.bookingStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-muted mb-1">Payment Status</label>
            <select class="form-select form-select-sm" id="detailPaymentStatus">
              <option value="pending" ${b.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="partial" ${b.paymentStatus === 'partial' ? 'selected' : ''}>Partial</option>
              <option value="paid" ${b.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="refunded" ${b.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
            </select>
          </div>
          <div class="col-md-4">
            <button type="button" class="btn btn-sm btn-ltw w-100" id="saveBookingStatusBtn">Save Status Update</button>
          </div>
        </div>

        ${
          balance > 0
            ? `<div class="row g-2 align-items-end mt-2 pt-2 border-top">
                <div class="col-md-4">
                  <label class="form-label small text-muted mb-1">Record Payment</label>
                  <input type="number" class="form-control form-control-sm tabular-nums" id="payAmtInput" value="${balance}" min="1" max="${balance}" />
                </div>
                <div class="col-md-4">
                  <label class="form-label small text-muted mb-1">Transaction Ref</label>
                  <input type="text" class="form-control form-control-sm" id="payRefInput" placeholder="UPI / Card ref" />
                </div>
                <div class="col-md-4">
                  <button type="button" class="btn btn-sm btn-outline-success w-100" id="recordPaymentBtn">Record Payment</button>
                </div>
              </div>`
            : ''
        }
      </div>
    </div>
    <div class="modal-footer border-top no-print">
      <button type="button" class="btn btn-outline-secondary" id="printInvoiceBtn">
        <i class="bi bi-printer me-1"></i>Print Invoice
      </button>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
    </div>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  contentEl.querySelector('#printInvoiceBtn')?.addEventListener('click', () => window.print());

  contentEl.querySelector('#saveBookingStatusBtn')?.addEventListener('click', async () => {
    const bStatus = (contentEl.querySelector('#detailBookingStatus') as HTMLSelectElement).value as BookingStatus;
    const pStatus = (contentEl.querySelector('#detailPaymentStatus') as HTMLSelectElement).value as PaymentStatus;
    try {
      await updateBookingStatus(b.id, bStatus, pStatus);
      showToast('Booking status updated.');
      modal.hide();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to update status'), 'danger');
    }
  });

  contentEl.querySelector('#recordPaymentBtn')?.addEventListener('click', async () => {
    const amt = Number((contentEl.querySelector('#payAmtInput') as HTMLInputElement).value);
    const ref = (contentEl.querySelector('#payRefInput') as HTMLInputElement).value;
    if (!amt || amt <= 0) {
      showToast('Enter a valid payment amount.', 'warning');
      return;
    }
    try {
      await recordPaymentForBooking(b, amt, b.paymentMethod, ref);
      showToast('Payment recorded and booking ledger updated.');
      modal.hide();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to record payment'), 'danger');
    }
  });
}

export function openBookingFormModal(booking?: Booking): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  if (state.customers.length === 0 || state.packages.length === 0) {
    showToast('Ensure at least one customer and one tour package exist first.', 'warning');
    return;
  }

  const isEdit = Boolean(booking);
  const currency = getCurrency();
  const defaultPkg = booking ? state.packages.find((p) => p.id === booking.packageId) : state.packages[0];

  const addDaysIso = (baseIso: string, days: number): string => {
    const d = new Date(baseIso);
    if (Number.isNaN(d.getTime())) return baseIso;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const defaultStart = addDaysIso(new Date().toISOString().slice(0, 10), 7);
  const defaultEnd = addDaysIso(defaultStart, Math.max(1, (defaultPkg?.durationDays ?? 4) - 1));
  const defaultNetRate = defaultPkg
    ? Math.round(defaultPkg.pricePerPerson * (1 - (defaultPkg.discountPercent || 0) / 100))
    : 0;

  contentEl.innerHTML = `
    <form id="bookingForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? `Edit Booking · ${escapeHtml(booking?.bookingCode)}` : 'Create New Booking'}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Customer *</label>
            <select class="form-select" name="customerId" required>
              ${state.customers
                .map((c) => `<option value="${escapeHtml(c.id)}" ${booking?.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.fullName)} (${escapeHtml(c.phone)})</option>`)
                .join('')}
            </select>
            <div class="invalid-feedback">Please select a customer.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Tour Package *</label>
            <select class="form-select" name="packageId" id="bookingPkgSelect" required>
              ${state.packages
                .map((p) => {
                  const net = Math.round(p.pricePerPerson * (1 - (p.discountPercent || 0) / 100));
                  return `<option value="${escapeHtml(p.id)}" data-price="${net}" data-days="${p.durationDays}" ${booking?.packageId === p.id ? 'selected' : ''}>${escapeHtml(p.title)} (${formatCurrency(net, currency)})</option>`;
                })
                .join('')}
            </select>
            <div class="invalid-feedback">Please select a tour package.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Assigned Vehicle</label>
            <select class="form-select" name="vehicleId">
              <option value="">No dedicated vehicle</option>
              ${state.vehicles
                .map((v) => `<option value="${escapeHtml(v.id)}" ${booking?.vehicleId === v.id ? 'selected' : ''}>${escapeHtml(v.name)} (${v.seatCapacity} seats)</option>`)
                .join('')}
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Travel Date *</label>
            <input type="date" class="form-control" name="travelDate" id="bkTravelDateInput" required value="${escapeHtml(booking?.travelDate || defaultStart)}" />
            <div class="invalid-feedback">Select travel start date.</div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Return Date *</label>
            <input type="date" class="form-control" name="returnDate" id="bkReturnDateInput" required value="${escapeHtml(booking?.returnDate || defaultEnd)}" />
            <div class="invalid-feedback">Select valid return date.</div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Adults *</label>
            <input type="number" class="form-control tabular-nums" name="adults" id="bkAdultsInput" required min="1" max="100" value="${booking?.adults ?? 2}" />
            <div class="invalid-feedback">At least 1 adult required.</div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Children</label>
            <input type="number" class="form-control tabular-nums" name="children" min="0" max="100" value="${booking?.children ?? 0}" />
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Total Amount *</label>
            <input type="number" class="form-control tabular-nums" name="totalAmount" id="bkTotalInput" required min="0" value="${booking?.totalAmount ?? defaultNetRate * 2}" />
            <div class="invalid-feedback">Enter total amount.</div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Paid Amount *</label>
            <input type="number" class="form-control tabular-nums" name="paidAmount" required min="0" value="${booking?.paidAmount ?? 0}" />
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Payment Method</label>
            <select class="form-select" name="paymentMethod">
              ${(['UPI', 'Card', 'Bank Transfer', 'Cash'] as PaymentMethod[])
                .map((m) => `<option value="${m}" ${booking?.paymentMethod === m ? 'selected' : ''}>${m}</option>`)
                .join('')}
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Payment Status</label>
            <select class="form-select" name="paymentStatus">
              ${(['pending', 'partial', 'paid', 'refunded'] as PaymentStatus[])
                .map((s) => `<option value="${s}" ${booking?.paymentStatus === s ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Booking Status</label>
            <select class="form-select" name="bookingStatus">
              ${(['pending', 'confirmed', 'completed', 'cancelled'] as BookingStatus[])
                .map((s) => `<option value="${s}" ${booking?.bookingStatus === s ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Passenger Names & Ages</label>
            <textarea class="form-control" name="passengerDetails" rows="2" maxlength="1000" placeholder="List lead traveler & accompanying passengers">${escapeHtml(booking?.passengerDetails || '')}</textarea>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Special Requests</label>
            <textarea class="form-control" name="specialRequests" rows="2" maxlength="1000" placeholder="Pickup preference, meal requests, etc.">${escapeHtml(booking?.specialRequests || '')}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer border-top">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-ltw" id="saveBookingBtn">${isEdit ? 'Save Booking' : 'Create Booking'}</button>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  const pkgSelect = contentEl.querySelector('#bookingPkgSelect') as HTMLSelectElement;
  const adultsInput = contentEl.querySelector('#bkAdultsInput') as HTMLInputElement;
  const totalInput = contentEl.querySelector('#bkTotalInput') as HTMLInputElement;
  const travelInput = contentEl.querySelector('#bkTravelDateInput') as HTMLInputElement;
  const returnInput = contentEl.querySelector('#bkReturnDateInput') as HTMLInputElement;

  const recalc = () => {
    if (isEdit) return;
    const opt = pkgSelect.selectedOptions[0];
    const price = Number(opt?.dataset.price || 0);
    const days = Math.max(1, Number(opt?.dataset.days || 1));
    const adults = Math.max(1, Number(adultsInput.value) || 1);
    totalInput.value = String(price * adults);
    if (travelInput.value) {
      returnInput.value = addDaysIso(travelInput.value, Math.max(0, days - 1));
    }
  };
  pkgSelect?.addEventListener('change', recalc);
  adultsInput?.addEventListener('input', recalc);
  travelInput?.addEventListener('change', recalc);

  const form = contentEl.querySelector('#bookingForm') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please complete all required booking fields.', 'warning');
      return;
    }
    const fd = new FormData(form);
    const btn = contentEl.querySelector('#saveBookingBtn') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await saveBooking({
        id: booking?.id,
        bookingCode: booking?.bookingCode,
        customerId: String(fd.get('customerId')),
        packageId: String(fd.get('packageId')),
        vehicleId: String(fd.get('vehicleId') || ''),
        travelDate: String(fd.get('travelDate')),
        returnDate: String(fd.get('returnDate')),
        adults: Number(fd.get('adults')),
        children: Number(fd.get('children')),
        totalAmount: Number(fd.get('totalAmount')),
        paidAmount: Number(fd.get('paidAmount')),
        paymentMethod: String(fd.get('paymentMethod')) as PaymentMethod,
        paymentStatus: String(fd.get('paymentStatus')) as PaymentStatus,
        bookingStatus: String(fd.get('bookingStatus')) as BookingStatus,
        passengerDetails: String(fd.get('passengerDetails') || ''),
        specialRequests: String(fd.get('specialRequests') || '')
      });
      modal.hide();
      showToast(isEdit ? 'Booking updated.' : 'Booking created.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save booking'), 'danger');
      btn.disabled = false;
    }
  });
}

export function renderBookingsView(route: RouteKey): string {
  const currency = getCurrency();
  const routeStatusMap: Record<string, string> = {
    'bookings-all': 'all',
    'bookings-pending': 'pending',
    'bookings-confirmed': 'confirmed',
    'bookings-cancelled': 'cancelled'
  };
  const statusFilter = routeStatusMap[route] || 'all';

  const titleMap: Record<string, string> = {
    all: 'All Bookings',
    pending: 'Pending Bookings',
    confirmed: 'Confirmed Bookings',
    cancelled: 'Cancelled Bookings'
  };

  const filtered = state.bookings.filter((b) => {
    if (statusFilter !== 'all' && b.bookingStatus !== statusFilter) return false;
    if (paymentFilter !== 'all' && b.paymentStatus !== paymentFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.packageTitle.toLowerCase().includes(q) ||
        b.destinationName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="mb-1 fw-bold">${titleMap[statusFilter]}</h4>
        <p class="text-muted small mb-0">Inspect traveler reservations, confirm departures, track payments, and generate invoices.</p>
      </div>
      <button type="button" class="btn btn-sm btn-ltw" id="addBookingBtn">
        <i class="bi bi-plus-lg me-1"></i>New Booking
      </button>
    </div>

    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-5">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="bookingSearchInput" placeholder="Search booking code, customer, destination..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" id="bookingPaymentFilter">
            <option value="all" ${paymentFilter === 'all' ? 'selected' : ''}>All Payment States</option>
            <option value="paid" ${paymentFilter === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="partial" ${paymentFilter === 'partial' ? 'selected' : ''}>Partial</option>
            <option value="pending" ${paymentFilter === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="refunded" ${paymentFilter === 'refunded' ? 'selected' : ''}>Refunded</option>
          </select>
        </div>
        <div class="col-md-4 d-flex justify-content-md-end gap-1 flex-wrap">
          <button type="button" class="btn btn-sm ${statusFilter === 'all' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="bookings-all">All</button>
          <button type="button" class="btn btn-sm ${statusFilter === 'pending' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="bookings-pending">Pending</button>
          <button type="button" class="btn btn-sm ${statusFilter === 'confirmed' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="bookings-confirmed">Confirmed</button>
          <button type="button" class="btn btn-sm ${statusFilter === 'cancelled' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="bookings-cancelled">Cancelled</button>
        </div>
      </div>
    </div>

    <div class="ltw-card overflow-hidden">
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Package & Destination</th>
              <th>Dates & Pax</th>
              <th>Payment</th>
              <th>Status</th>
              <th class="text-end">Total / Paid</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              paged.slice.length === 0
                ? `<tr><td colspan="8" class="text-center py-5 text-muted">No bookings found for this filter.</td></tr>`
                : paged.slice
                    .map(
                      (b) => `
                  <tr>
                    <td class="font-mono-num fw-semibold">${escapeHtml(b.bookingCode)}</td>
                    <td>
                      <div class="fw-medium">${escapeHtml(b.customerName)}</div>
                      <div class="small text-muted">${escapeHtml(b.customerPhone)}</div>
                    </td>
                    <td>
                      <div class="fw-medium text-truncate" style="max-width: 210px;" title="${escapeHtml(b.packageTitle)}">${escapeHtml(b.packageTitle)}</div>
                      <div class="small text-muted">${escapeHtml(b.destinationName)}</div>
                    </td>
                    <td class="small tabular-nums">
                      <div>${escapeHtml(b.travelDate)}</div>
                      <div class="text-muted">${b.adults} Adults${b.children ? `, ${b.children} Child` : ''}</div>
                    </td>
                    <td>
                      <div>${renderStatusLabel(b.paymentStatus)}</div>
                      <div class="small text-muted">${escapeHtml(b.paymentMethod)}</div>
                    </td>
                    <td>${renderStatusLabel(b.bookingStatus)}</td>
                    <td class="text-end tabular-nums">
                      <div class="fw-semibold">${formatCurrency(b.totalAmount, currency)}</div>
                      <div class="small text-muted">Paid ${formatCurrency(b.paidAmount, currency)}</div>
                    </td>
                    <td class="text-end text-nowrap">
                      <button type="button" class="btn btn-sm btn-outline-secondary" data-view-booking="${escapeHtml(b.id)}" title="Details & Invoice">
                        <i class="bi bi-receipt"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary ms-1" data-edit-booking="${escapeHtml(b.id)}" title="Edit">
                        <i class="bi bi-pencil"></i>
                      </button>
                      ${
                        b.bookingStatus === 'pending'
                          ? `<button type="button" class="btn btn-sm btn-outline-success ms-1" data-confirm-booking="${escapeHtml(b.id)}" title="Confirm">
                              <i class="bi bi-check-lg"></i>
                            </button>`
                          : ''
                      }
                      <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-booking="${escapeHtml(b.id)}" title="Delete">
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
      ${
        paged.totalPages > 1
          ? `<div class="p-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span class="small text-muted">Page ${paged.currentPage} of ${paged.totalPages}</span>
              ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-bk-page')}
            </div>`
          : ''
      }
    </div>
  `;
}

export function bindBookingsEvents(root: HTMLElement): void {
  root.querySelector('#addBookingBtn')?.addEventListener('click', () => openBookingFormModal());

  root.querySelector('#bookingSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#bookingPaymentFilter')?.addEventListener('change', (e) => {
    paymentFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-bk-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.bkPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-view-booking]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.viewBooking;
      if (id) openBookingDetailModal(id);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-booking]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const booking = state.bookings.find((b) => b.id === btn.dataset.editBooking);
      if (booking) openBookingFormModal(booking);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-confirm-booking]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.confirmBooking;
      if (!id) return;
      try {
        await updateBookingStatus(id, 'confirmed');
        showToast('Booking confirmed.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to confirm booking'), 'danger');
      }
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-booking]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const b = state.bookings.find((item) => item.id === btn.dataset.delBooking);
      if (!b) return;
      const ok = await confirmDialog({
        title: 'Delete Booking',
        message: `Delete reservation ${b.bookingCode} for ${b.customerName}?`,
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deleteBooking(b.id);
        showToast('Booking deleted.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete booking'), 'danger');
      }
    });
  });
}
