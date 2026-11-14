import { Chart, registerables } from 'chart.js';
import { navigateTo, state, getCurrency, updateBookingStatus } from '../store';
import type { RouteKey } from '../types';
import {
  escapeHtml,
  exportRowsToCsv,
  extractErrorMessage,
  formatCurrency,
  formatDate,
  renderStatusLabel,
  showToast
} from '../utils/format';
import { openBookingDetailModal } from './bookings';

Chart.register(...registerables);

let revenueChartInstance: Chart | null = null;
let statusChartInstance: Chart | null = null;
let analyticsDestChartInstance: Chart | null = null;
let analyticsPayChartInstance: Chart | null = null;

let reportFrom = '';
let reportTo = '';
let reportStatus = 'all';

function destroyDashboardCharts(): void {
  revenueChartInstance?.destroy();
  revenueChartInstance = null;
  statusChartInstance?.destroy();
  statusChartInstance = null;
  analyticsDestChartInstance?.destroy();
  analyticsDestChartInstance = null;
  analyticsPayChartInstance?.destroy();
  analyticsPayChartInstance = null;
}

function getMonthlyRevenueSeries(): { labels: string[]; values: number[] } {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const totals = new Array(12).fill(0);

  for (const b of state.bookings) {
    if (b.bookingStatus === 'cancelled') continue;
    const d = new Date(b.travelDate);
    if (!Number.isNaN(d.getTime())) {
      totals[d.getMonth()] += Number(b.totalAmount) || 0;
    }
  }
  return { labels: months, values: totals };
}

export function renderDashboardView(route: RouteKey): string {
  const currency = getCurrency();
  const totalBookings = state.bookings.length;
  const pendingBookings = state.bookings.filter((b) => b.bookingStatus === 'pending').length;
  const confirmedBookings = state.bookings.filter((b) => b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed').length;
  const cancelledBookings = state.bookings.filter((b) => b.bookingStatus === 'cancelled').length;
  const totalRevenue = state.bookings
    .filter((b) => b.bookingStatus !== 'cancelled')
    .reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
  const collectedRevenue = state.bookings
    .filter((b) => b.bookingStatus !== 'cancelled')
    .reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);

  if (route === 'dashboard-analytics') {
    const avgBooking = totalBookings > 0 ? totalRevenue / Math.max(1, totalBookings - cancelledBookings) : 0;
    const confirmRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;
    const activeVehicles = state.vehicles.filter((v) => v.status !== 'maintenance').length;
    const resolvedEnquiries = state.enquiries.filter((e) => e.status === 'resolved' || e.status === 'closed').length;

    return `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 class="mb-1 fw-bold">Travel Analytics</h4>
          <p class="text-muted small mb-0">Live performance metrics computed from Firestore bookings, destinations, and fleet records.</p>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-route="dashboard-reports">
          <i class="bi bi-file-earmark-spreadsheet me-1"></i>View Financial Reports
        </button>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-6 col-xl-3">
          <div class="ltw-kpi-card">
            <div class="text-muted small">Average Booking Value</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${formatCurrency(avgBooking, currency)}</div>
            <div class="small text-muted mt-1">Across non-cancelled trips</div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="ltw-kpi-card">
            <div class="text-muted small">Confirmation Rate</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${confirmRate}%</div>
            <div class="small text-muted mt-1">${confirmedBookings} of ${totalBookings} bookings</div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="ltw-kpi-card">
            <div class="text-muted small">Active Mountain Fleet</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${activeVehicles} / ${state.vehicles.length}</div>
            <div class="small text-muted mt-1">Vehicles operational</div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="ltw-kpi-card">
            <div class="text-muted small">Enquiries Resolved</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${resolvedEnquiries} / ${state.enquiries.length}</div>
            <div class="small text-muted mt-1">Response pipeline</div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-7">
          <div class="ltw-card p-3 p-md-4 h-100">
            <h6 class="fw-semibold mb-3">Revenue by Destination</h6>
            <div class="ltw-chart-box" style="height: 290px;">
              <canvas id="analyticsDestChart"></canvas>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="ltw-card p-3 p-md-4 h-100">
            <h6 class="fw-semibold mb-3">Payment Method Breakdown</h6>
            <div class="ltw-chart-box" style="height: 290px;">
              <canvas id="analyticsPayChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (route === 'dashboard-reports') {
    const filtered = state.bookings.filter((b) => {
      if (reportStatus !== 'all' && b.bookingStatus !== reportStatus) return false;
      if (reportFrom && b.travelDate < reportFrom) return false;
      if (reportTo && b.travelDate > reportTo) return false;
      return true;
    });
    const sumTotal = filtered.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
    const sumPaid = filtered.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);

    return `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 class="mb-1 fw-bold">Booking & Financial Reports</h4>
          <p class="text-muted small mb-0">Filter bookings by travel window and export clean CSV statements.</p>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" id="printReportBtn">
            <i class="bi bi-printer me-1"></i>Print Report
          </button>
          <button type="button" class="btn btn-sm btn-ltw" id="exportReportCsvBtn">
            <i class="bi bi-download me-1"></i>Export CSV
          </button>
        </div>
      </div>

      <div class="ltw-card p-3 mb-3 no-print">
        <div class="row g-2 align-items-end">
          <div class="col-sm-4 col-md-3">
            <label class="form-label small text-muted mb-1">Travel From</label>
            <input type="date" class="form-control form-control-sm" id="reportFromInput" value="${escapeHtml(reportFrom)}" />
          </div>
          <div class="col-sm-4 col-md-3">
            <label class="form-label small text-muted mb-1">Travel To</label>
            <input type="date" class="form-control form-control-sm" id="reportToInput" value="${escapeHtml(reportTo)}" />
          </div>
          <div class="col-sm-4 col-md-3">
            <label class="form-label small text-muted mb-1">Booking Status</label>
            <select class="form-select form-select-sm" id="reportStatusSelect">
              <option value="all" ${reportStatus === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="pending" ${reportStatus === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${reportStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="completed" ${reportStatus === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${reportStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
          <div class="col-md-3 d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary w-100" id="resetReportFiltersBtn">Reset</button>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-sm-4">
          <div class="ltw-kpi-card">
            <div class="small text-muted">Filtered Bookings</div>
            <div class="fs-4 fw-bold tabular-nums">${filtered.length}</div>
          </div>
        </div>
        <div class="col-sm-4">
          <div class="ltw-kpi-card">
            <div class="small text-muted">Gross Booking Value</div>
            <div class="fs-4 fw-bold tabular-nums">${formatCurrency(sumTotal, currency)}</div>
          </div>
        </div>
        <div class="col-sm-4">
          <div class="ltw-kpi-card">
            <div class="small text-muted">Collected Amount</div>
            <div class="fs-4 fw-bold tabular-nums">${formatCurrency(sumPaid, currency)}</div>
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
                <th>Destination & Package</th>
                <th>Travel Dates</th>
                <th>Status</th>
                <th class="text-end">Total</th>
                <th class="text-end">Paid</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtered.length === 0
                  ? `<tr><td colspan="7" class="text-center py-4 text-muted">No bookings match the selected report filters.</td></tr>`
                  : filtered
                      .map(
                        (b) => `
                    <tr>
                      <td class="font-mono-num fw-semibold">${escapeHtml(b.bookingCode)}</td>
                      <td>
                        <div class="fw-medium">${escapeHtml(b.customerName)}</div>
                        <div class="small text-muted">${escapeHtml(b.customerPhone)}</div>
                      </td>
                      <td>
                        <div class="fw-medium">${escapeHtml(b.packageTitle)}</div>
                        <div class="small text-muted">${escapeHtml(b.destinationName)}</div>
                      </td>
                      <td class="tabular-nums small">${escapeHtml(b.travelDate)} → ${escapeHtml(b.returnDate)}</td>
                      <td>${renderStatusLabel(b.bookingStatus)}</td>
                      <td class="text-end tabular-nums fw-semibold">${formatCurrency(b.totalAmount, currency)}</td>
                      <td class="text-end tabular-nums">${formatCurrency(b.paidAmount, currency)}</td>
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

  // Default: Dashboard Overview
  const recentBookings = state.bookings.slice(0, 6);
  const recentCustomers = state.customers.slice(0, 5);
  const destCounts = new Map<string, { count: number; revenue: number }>();
  for (const b of state.bookings) {
    if (b.bookingStatus === 'cancelled') continue;
    const prev = destCounts.get(b.destinationId) ?? { count: 0, revenue: 0 };
    destCounts.set(b.destinationId, {
      count: prev.count + 1,
      revenue: prev.revenue + (Number(b.totalAmount) || 0)
    });
  }

  const popularDestinations = [...state.destinations]
    .map((d) => ({
      dest: d,
      bookings: destCounts.get(d.id)?.count ?? 0,
      revenue: destCounts.get(d.id)?.revenue ?? 0
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 4);

  const generalSetting = state.settings.find((s) => s.group === 'general');
  const brandName = generalSetting?.siteName || 'Live The World';
  const years = [...new Set(
    state.bookings
      .map((b) => new Date(b.travelDate).getFullYear())
      .filter((y) => !Number.isNaN(y))
  )].sort();
  const yearLabel = years.length > 0 ? years.join('–') : String(new Date().getFullYear());

  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="mb-1 fw-bold">${escapeHtml(brandName)} — Operations Overview</h4>
        <p class="text-muted small mb-0">Real-time travel bookings, revenue, destinations, and customer activity.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-route="packages-add">
          <i class="bi bi-plus-lg me-1"></i>New Package
        </button>
        <button type="button" class="btn btn-sm btn-ltw" data-route="bookings-all">
          <i class="bi bi-journal-plus me-1"></i>Manage Bookings
        </button>
      </div>
    </div>

    <!-- 8 Live KPI Cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="bookings-all" title="View all bookings">
          <div class="min-w-0">
            <div class="text-muted small">Total Bookings</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${totalBookings}</div>
            <div class="small text-muted mt-1">All travel reservations</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-journal-check"></i></span>
        </div>
      </div>
      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="dashboard-reports" title="Open financial reports">
          <div class="min-w-0">
            <div class="text-muted small">Total Revenue</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${formatCurrency(totalRevenue, currency)}</div>
            <div class="small text-muted mt-1">${formatCurrency(collectedRevenue, currency)} collected</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-currency-rupee"></i></span>
        </div>
      </div>
      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="customers-all" title="View all customers">
          <div class="min-w-0">
            <div class="text-muted small">Total Customers</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${state.customers.length}</div>
            <div class="small text-muted mt-1">Registered travelers</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-people"></i></span>
        </div>
      </div>
      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="destinations-manage" title="Open Manage Destinations">
          <div class="min-w-0">
            <div class="text-muted small">Total Destinations</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${state.destinations.length}</div>
            <div class="small text-muted mt-1">${state.destinations.filter((d) => d.status === 'active').length} active regions</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-geo-alt"></i></span>
        </div>
      </div>

      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="bookings-pending" title="View pending bookings">
          <div class="min-w-0">
            <div class="text-muted small">Pending Bookings</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1 text-warning">${pendingBookings}</div>
            <div class="small text-muted mt-1">Awaiting confirmation</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-hourglass-split"></i></span>
        </div>
      </div>
      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="bookings-confirmed" title="View confirmed bookings">
          <div class="min-w-0">
            <div class="text-muted small">Confirmed Bookings</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1 text-success">${confirmedBookings}</div>
            <div class="small text-muted mt-1">Confirmed & completed</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-check2-circle"></i></span>
        </div>
      </div>
      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="bookings-cancelled" title="View cancelled bookings">
          <div class="min-w-0">
            <div class="text-muted small">Cancelled Bookings</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1 text-danger">${cancelledBookings}</div>
            <div class="small text-muted mt-1">Cancelled or refunded</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-x-circle"></i></span>
        </div>
      </div>
      <div class="col-6 col-md-4 col-xl-3">
        <div class="ltw-kpi-card d-flex align-items-start justify-content-between gap-2" role="button" tabindex="0" data-route="packages-manage" title="Manage tour packages">
          <div class="min-w-0">
            <div class="text-muted small">Total Tour Packages</div>
            <div class="ltw-kpi-value fw-bold tabular-nums mt-1">${state.packages.length}</div>
            <div class="small text-muted mt-1">${state.packages.filter((p) => p.status === 'active').length} active packages</div>
          </div>
          <span class="ltw-kpi-icon"><i class="bi bi-compass"></i></span>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="row g-3 mb-4">
      <div class="col-lg-8">
        <div class="ltw-card p-3 p-md-4 h-100">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <h6 class="fw-semibold mb-0">Monthly Revenue Chart</h6>
              <div class="small text-muted">Scheduled trip revenue across ${escapeHtml(yearLabel)}</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-route="dashboard-analytics">Details</button>
          </div>
          <div class="ltw-chart-box">
            <canvas id="monthlyRevenueChart"></canvas>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="ltw-card p-3 p-md-4 h-100">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h6 class="fw-semibold mb-0">Booking Statistics</h6>
              <div class="small text-muted">Distribution by status</div>
            </div>
          </div>
          <div class="ltw-chart-box">
            <canvas id="bookingStatusChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Bookings + Recent Customers -->
    <div class="row g-3 mb-4">
      <div class="col-xl-8">
        <div class="ltw-card overflow-hidden h-100">
          <div class="p-3 px-4 border-bottom d-flex align-items-center justify-content-between">
            <h6 class="fw-semibold mb-0">Recent Booking Activity</h6>
            <button type="button" class="btn btn-sm btn-link text-decoration-none p-0" data-route="bookings-all">View all</button>
          </div>
          <div class="table-responsive">
            <table class="table ltw-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Traveler</th>
                  <th>Package</th>
                  <th>Travel Date</th>
                  <th>Status</th>
                  <th class="text-end">Amount</th>
                  <th class="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                ${
                  recentBookings.length === 0
                    ? `<tr><td colspan="7" class="text-center py-4 text-muted">No bookings recorded yet.</td></tr>`
                    : recentBookings
                        .map(
                          (b) => `
                      <tr>
                        <td class="font-mono-num fw-semibold">${escapeHtml(b.bookingCode)}</td>
                        <td>
                          <div class="fw-medium">${escapeHtml(b.customerName)}</div>
                          <div class="small text-muted">${b.adults}A${b.children ? ` · ${b.children}C` : ''}</div>
                        </td>
                        <td>
                          <div class="text-truncate" style="max-width: 190px;" title="${escapeHtml(b.packageTitle)}">${escapeHtml(b.packageTitle)}</div>
                          <div class="small text-muted">${escapeHtml(b.destinationName)}</div>
                        </td>
                        <td class="tabular-nums small">${escapeHtml(b.travelDate)}</td>
                        <td>${renderStatusLabel(b.bookingStatus)}</td>
                        <td class="text-end tabular-nums fw-semibold">${formatCurrency(b.totalAmount, currency)}</td>
                        <td class="text-end text-nowrap">
                          <button type="button" class="btn btn-sm btn-outline-secondary" data-view-booking="${escapeHtml(b.id)}" title="Details & Invoice">
                            <i class="bi bi-eye"></i>
                          </button>
                          ${
                            b.bookingStatus === 'pending'
                              ? `<button type="button" class="btn btn-sm btn-outline-success ms-1" data-quick-confirm="${escapeHtml(b.id)}" title="Confirm booking">
                                  <i class="bi bi-check-lg"></i>
                                </button>`
                              : ''
                          }
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
      </div>

      <div class="col-xl-4">
        <div class="ltw-card h-100 d-flex flex-column">
          <div class="p-3 px-4 border-bottom d-flex align-items-center justify-content-between">
            <h6 class="fw-semibold mb-0">Recent Customer Registrations</h6>
            <button type="button" class="btn btn-sm btn-link text-decoration-none p-0" data-route="customers-all">All</button>
          </div>
          <div class="divide-y flex-grow-1">
            ${
              recentCustomers.length === 0
                ? `<div class="p-4 text-center text-muted small">No customer records yet.</div>`
                : recentCustomers
                    .map(
                      (c) => `
                  <div class="p-3 px-4 border-bottom d-flex align-items-center justify-content-between gap-2">
                    <div class="d-flex align-items-center gap-2 min-w-0">
                      <span class="ltw-avatar">${escapeHtml(c.fullName.slice(0, 2).toUpperCase())}</span>
                      <div class="min-w-0">
                        <div class="fw-medium small text-truncate">${escapeHtml(c.fullName)}</div>
                        <div class="text-muted text-truncate" style="font-size: 12px;">${escapeHtml(c.city || c.email)}</div>
                      </div>
                    </div>
                    <div class="text-end flex-shrink-0">
                      ${renderStatusLabel(c.status)}
                      <div class="text-muted" style="font-size: 11px;">${formatDate(c.createdAt)}</div>
                    </div>
                  </div>
                `
                    )
                    .join('')
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Popular Destinations -->
    <div class="ltw-card p-3 p-md-4">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h6 class="fw-semibold mb-0">Popular Destinations</h6>
          <div class="small text-muted">Top Himalayan regions ranked by booking volume</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-route="destinations-manage">Manage All (${state.destinations.length})</button>
      </div>
      <div class="row g-3">
        ${
          popularDestinations.length === 0
            ? `<div class="col-12 text-center py-3 text-muted small">Add destinations to track popularity.</div>`
            : popularDestinations
                .map(
                  ({ dest, bookings, revenue }) => `
              <div class="col-sm-6 col-xl-3">
                <div class="ltw-card overflow-hidden h-100" role="button" tabindex="0" data-route="destinations-manage" title="Manage ${escapeHtml(dest.name)}">
                  ${
                    dest.imageUrl
                      ? `<img src="${escapeHtml(dest.imageUrl)}" alt="${escapeHtml(dest.name)}" class="ltw-media-card-img" referrerpolicy="no-referrer" />`
                      : `<div class="ltw-media-card-img d-flex align-items-center justify-content-center text-muted"><i class="bi bi-image fs-2"></i></div>`
                  }
                  <div class="p-3">
                    <div class="small text-muted mb-1">${escapeHtml(dest.region)} · ${escapeHtml(dest.category)}</div>
                    <div class="fw-semibold mb-2">${escapeHtml(dest.name)}</div>
                    <div class="d-flex justify-content-between small border-top pt-2 tabular-nums">
                      <span class="text-muted">${bookings} Bookings</span>
                      <span class="fw-semibold">${formatCurrency(revenue, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            `
                )
                .join('')
        }
      </div>
    </div>
  `;
}

export function bindDashboardEvents(root: HTMLElement, route: RouteKey): void {
  destroyDashboardCharts();

  const textColor = state.theme === 'dark' ? '#cbd5e1' : '#475569';
  const gridColor = state.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)';

  if (route === 'dashboard-overview') {
    const revCanvas = root.querySelector('#monthlyRevenueChart') as HTMLCanvasElement | null;
    if (revCanvas) {
      const series = getMonthlyRevenueSeries();
      revenueChartInstance = new Chart(revCanvas, {
        type: 'bar',
        data: {
          labels: series.labels,
          datasets: [
            {
              label: 'Revenue',
              data: series.values,
              backgroundColor: 'rgba(13, 148, 136, 0.82)',
              borderRadius: 6,
              maxBarThickness: 28
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      });
    }

    const statusCanvas = root.querySelector('#bookingStatusChart') as HTMLCanvasElement | null;
    if (statusCanvas) {
      const pending = state.bookings.filter((b) => b.bookingStatus === 'pending').length;
      const confirmed = state.bookings.filter((b) => b.bookingStatus === 'confirmed').length;
      const completed = state.bookings.filter((b) => b.bookingStatus === 'completed').length;
      const cancelled = state.bookings.filter((b) => b.bookingStatus === 'cancelled').length;

      statusChartInstance = new Chart(statusCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Confirmed', 'Completed', 'Pending', 'Cancelled'],
          datasets: [
            {
              data: [confirmed, completed, pending, cancelled],
              backgroundColor: ['#0d9488', '#0284c7', '#d97706', '#dc2626'],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '64%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, boxWidth: 12, padding: 14 }
            }
          }
        }
      });
    }

    root.querySelectorAll<HTMLElement>('[data-view-booking]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.viewBooking;
        if (id) openBookingDetailModal(id);
      });
    });

    root.querySelectorAll<HTMLElement>('[data-quick-confirm]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.quickConfirm;
        if (!id) return;
        try {
          await updateBookingStatus(id, 'confirmed');
          showToast('Booking confirmed.');
        } catch (err) {
          showToast(extractErrorMessage(err, 'Unable to confirm booking'), 'danger');
        }
      });
    });
  }

  if (route === 'dashboard-analytics') {
    const destCanvas = root.querySelector('#analyticsDestChart') as HTMLCanvasElement | null;
    if (destCanvas) {
      const map = new Map<string, number>();
      for (const b of state.bookings) {
        if (b.bookingStatus === 'cancelled') continue;
        map.set(b.destinationName, (map.get(b.destinationName) || 0) + (Number(b.totalAmount) || 0));
      }
      const destLabels = map.size > 0 ? [...map.keys()] : ['No active bookings'];
      const destValues = map.size > 0 ? [...map.values()] : [0];
      analyticsDestChartInstance = new Chart(destCanvas, {
        type: 'bar',
        data: {
          labels: destLabels,
          datasets: [
            {
              label: 'Revenue',
              data: destValues,
              backgroundColor: '#0f766e',
              borderRadius: 6
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { display: false }, ticks: { color: textColor } }
          }
        }
      });
    }

    const payCanvas = root.querySelector('#analyticsPayChart') as HTMLCanvasElement | null;
    if (payCanvas) {
      const methods = ['UPI', 'Card', 'Bank Transfer', 'Cash'];
      const vals = methods.map((m) =>
        state.bookings
          .filter((b) => b.paymentMethod === m && b.bookingStatus !== 'cancelled')
          .reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0)
      );
      analyticsPayChartInstance = new Chart(payCanvas, {
        type: 'pie',
        data: {
          labels: methods,
          datasets: [
            {
              data: vals,
              backgroundColor: ['#0d9488', '#0284c7', '#6366f1', '#f59e0b'],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12 } }
          }
        }
      });
    }
  }

  if (route === 'dashboard-reports') {
    root.querySelector('#reportFromInput')?.addEventListener('change', (e) => {
      reportFrom = (e.target as HTMLInputElement).value;
      navigateTo('dashboard-reports');
    });
    root.querySelector('#reportToInput')?.addEventListener('change', (e) => {
      reportTo = (e.target as HTMLInputElement).value;
      navigateTo('dashboard-reports');
    });
    root.querySelector('#reportStatusSelect')?.addEventListener('change', (e) => {
      reportStatus = (e.target as HTMLSelectElement).value;
      navigateTo('dashboard-reports');
    });
    root.querySelector('#resetReportFiltersBtn')?.addEventListener('click', () => {
      reportFrom = '';
      reportTo = '';
      reportStatus = 'all';
      navigateTo('dashboard-reports');
    });
    root.querySelector('#printReportBtn')?.addEventListener('click', () => window.print());
    root.querySelector('#exportReportCsvBtn')?.addEventListener('click', () => {
      const rows = state.bookings
        .filter((b) => {
          if (reportStatus !== 'all' && b.bookingStatus !== reportStatus) return false;
          if (reportFrom && b.travelDate < reportFrom) return false;
          if (reportTo && b.travelDate > reportTo) return false;
          return true;
        })
        .map((b) => [
          b.bookingCode,
          b.customerName,
          b.customerEmail,
          b.destinationName,
          b.packageTitle,
          b.travelDate,
          b.returnDate,
          b.bookingStatus,
          b.paymentStatus,
          b.totalAmount,
          b.paidAmount
        ]);
      exportRowsToCsv('livetheworld-bookings-report.csv', [
        'Booking Code', 'Customer', 'Email', 'Destination', 'Package', 'Travel Date', 'Return Date', 'Booking Status', 'Payment Status', 'Total Amount', 'Paid Amount'
      ], rows);
      showToast('CSV report downloaded.');
    });
  }
}
