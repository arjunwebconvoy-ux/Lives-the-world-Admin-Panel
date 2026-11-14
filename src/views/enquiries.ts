import { Modal } from 'bootstrap';
import { deleteEnquiry, saveEnquiry, state } from '../store';
import type { Enquiry, EnquiryStatus, EnquiryType, RouteKey } from '../types';
import {
  confirmDialog,
  escapeHtml,
  extractErrorMessage,
  formatDate,
  paginate,
  renderPaginationHtml,
  renderStatusLabel,
  showToast
} from '../utils/format';

let searchTerm = '';
let statusFilter = 'all';
let currentPage = 1;

function openEnquiryModal(enq?: Enquiry, defaultType: EnquiryType = 'contact'): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const isEdit = Boolean(enq);
  contentEl.innerHTML = `
    <form id="enquiryForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? 'Manage Enquiry & Reply' : 'Log Customer Enquiry'}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          ${
            !isEdit
              ? `
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Enquiry Type *</label>
              <select class="form-select" name="type">
                <option value="contact" ${defaultType === 'contact' ? 'selected' : ''}>Contact Form</option>
                <option value="tour" ${defaultType === 'tour' ? 'selected' : ''}>Tour Enquiry</option>
                <option value="custom_trip" ${defaultType === 'custom_trip' ? 'selected' : ''}>Custom Trip</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Sender Name *</label>
              <input type="text" class="form-control" name="senderName" required minlength="2" maxlength="120" />
              <div class="invalid-feedback">Enter sender name (at least 2 characters).</div>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Sender Email *</label>
              <input type="email" class="form-control" name="senderEmail" required maxlength="160" />
              <div class="invalid-feedback">Enter a valid email address.</div>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Phone</label>
              <input type="text" class="form-control" name="senderPhone" maxlength="30" />
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Preferred Date</label>
              <input type="date" class="form-control" name="preferredDate" />
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Travelers</label>
              <input type="number" class="form-control tabular-nums" name="travelersCount" min="1" max="200" value="2" />
            </div>
          `
              : `
            <div class="col-12">
              <div class="p-3 rounded border">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <div class="fw-bold">${escapeHtml(enq?.senderName)}</div>
                    <div class="small text-muted">${escapeHtml(enq?.senderEmail)} · ${escapeHtml(enq?.senderPhone || 'No phone')}</div>
                  </div>
                  ${renderStatusLabel(enq?.status || 'new')}
                </div>
                <div class="small text-secondary mt-2">${escapeHtml(enq?.message)}</div>
                ${enq?.preferredDate ? `<div class="small text-muted mt-2">Preferred Date: ${escapeHtml(enq.preferredDate)} · Travelers: ${enq.travelersCount || 1}</div>` : ''}
              </div>
            </div>
          `
          }
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Subject *</label>
            <input type="text" class="form-control" name="subject" required maxlength="200" value="${escapeHtml(enq?.subject || '')}" />
            <div class="invalid-feedback">Please enter a subject.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Package Interest</label>
            <select class="form-select" name="packageTitle">
              <option value="">General / Not specified</option>
              ${state.packages.map((p) => `<option value="${escapeHtml(p.title)}" ${enq?.packageTitle === p.title ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('')}
            </select>
          </div>
          ${
            !isEdit
              ? `<div class="col-12">
                  <label class="form-label small fw-semibold">Customer Message *</label>
                  <textarea class="form-control" name="message" rows="3" required maxlength="2500"></textarea>
                  <div class="invalid-feedback">Please enter the enquiry message.</div>
                </div>`
              : ''
          }
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Enquiry Status *</label>
            <select class="form-select" name="status">
              <option value="new" ${enq?.status === 'new' || !enq ? 'selected' : ''}>New</option>
              <option value="in_progress" ${enq?.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved" ${enq?.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              <option value="closed" ${enq?.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Admin Response / Internal Resolution Notes</label>
            <textarea class="form-control" name="adminReply" rows="3" maxlength="2500" placeholder="Record quote sent, call summary, or email response...">${escapeHtml(enq?.adminReply || '')}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer border-top">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-ltw" id="saveEnqBtn">${isEdit ? 'Update Enquiry' : 'Log Enquiry'}</button>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  const form = contentEl.querySelector('#enquiryForm') as HTMLFormElement;
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required]').forEach((el) => {
    el.addEventListener('input', () => el.setCustomValidity(''));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectEl = form.elements.namedItem('subject') as HTMLInputElement | null;
    const senderNameEl = form.elements.namedItem('senderName') as HTMLInputElement | null;
    const msgEl = form.elements.namedItem('message') as HTMLTextAreaElement | null;
    if (subjectEl) subjectEl.setCustomValidity(subjectEl.value.trim().length < 2 ? 'Subject is required.' : '');
    if (senderNameEl) senderNameEl.setCustomValidity(senderNameEl.value.trim().length < 2 ? 'Sender name is required.' : '');
    if (msgEl) msgEl.setCustomValidity(msgEl.value.trim().length < 2 ? 'Message is required.' : '');

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please complete all required enquiry fields.', 'warning');
      return;
    }
    const fd = new FormData(form);
    const btn = contentEl.querySelector('#saveEnqBtn') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await saveEnquiry({
        id: enq?.id,
        type: enq?.type || (String(fd.get('type')) as EnquiryType),
        senderName: enq?.senderName || String(fd.get('senderName') || '').trim(),
        senderEmail: enq?.senderEmail || String(fd.get('senderEmail') || '').trim(),
        senderPhone: enq?.senderPhone || String(fd.get('senderPhone') || '').trim(),
        preferredDate: enq?.preferredDate ?? String(fd.get('preferredDate') || ''),
        travelersCount: enq?.travelersCount ?? Number(fd.get('travelersCount') || 1),
        subject: String(fd.get('subject')).trim(),
        packageTitle: String(fd.get('packageTitle') || ''),
        message: enq?.message || String(fd.get('message') || '').trim(),
        status: String(fd.get('status')) as EnquiryStatus,
        adminReply: String(fd.get('adminReply') || '').trim()
      });
      modal.hide();
      showToast(isEdit ? 'Enquiry updated.' : 'Enquiry logged.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save enquiry'), 'danger');
      btn.disabled = false;
    }
  });
}

export function renderEnquiriesView(route: RouteKey): string {
  const titleMap: Record<string, string> = {
    'enquiries-contact': 'Contact Form Enquiries',
    'enquiries-tour': 'Tour & Package Enquiries',
    'enquiries-messages': 'All Customer Messages'
  };

  const filtered = state.enquiries.filter((e) => {
    if (route === 'enquiries-contact' && e.type !== 'contact') return false;
    if (route === 'enquiries-tour' && e.type === 'contact') return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.senderName.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.senderEmail.toLowerCase().includes(q) ||
        (e.packageTitle || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="mb-1 fw-bold">${titleMap[route] || 'Enquiry Management'}</h4>
        <p class="text-muted small mb-0">Respond to customer travel queries, track quote progress, and manage enquiry statuses.</p>
      </div>
      <button type="button" class="btn btn-sm btn-ltw" id="addEnquiryBtn">
        <i class="bi bi-plus-lg me-1"></i>Log Enquiry
      </button>
    </div>

    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-5">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="enqSearchInput" placeholder="Search sender, subject, or package..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" id="enqStatusFilter">
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="new" ${statusFilter === 'new' ? 'selected' : ''}>New</option>
            <option value="in_progress" ${statusFilter === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="resolved" ${statusFilter === 'resolved' ? 'selected' : ''}>Resolved</option>
            <option value="closed" ${statusFilter === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <div class="col-md-4 d-flex flex-wrap justify-content-md-end gap-1">
          <button type="button" class="btn btn-sm ${route === 'enquiries-contact' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="enquiries-contact">Contact</button>
          <button type="button" class="btn btn-sm ${route === 'enquiries-tour' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="enquiries-tour">Tour Enquiries</button>
          <button type="button" class="btn btn-sm ${route === 'enquiries-messages' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="enquiries-messages">All Messages</button>
        </div>
      </div>
    </div>

    <div class="ltw-card overflow-hidden">
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>Sender</th>
              <th>Type</th>
              <th>Subject & Package</th>
              <th>Received</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              paged.slice.length === 0
                ? `<tr><td colspan="6" class="text-center py-5 text-muted">No enquiries found.</td></tr>`
                : paged.slice
                    .map(
                      (e) => `
                  <tr>
                    <td>
                      <div class="fw-semibold">${escapeHtml(e.senderName)}</div>
                      <div class="small text-muted">${escapeHtml(e.senderEmail)}</div>
                    </td>
                    <td class="text-capitalize small">${escapeHtml(e.type.replace('_', ' '))}</td>
                    <td>
                      <div class="fw-medium">${escapeHtml(e.subject)}</div>
                      <div class="small text-muted text-truncate" style="max-width: 280px;">${escapeHtml(e.packageTitle || e.message)}</div>
                    </td>
                    <td class="small text-muted">${formatDate(e.createdAt)}</td>
                    <td>${renderStatusLabel(e.status)}</td>
                    <td class="text-end text-nowrap">
                      <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-enq="${escapeHtml(e.id)}" title="Reply & Update Status">
                        <i class="bi bi-reply"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-enq="${escapeHtml(e.id)}" title="Delete">
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
              ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-enq-page')}
            </div>`
          : ''
      }
    </div>
  `;
}

export function bindEnquiriesEvents(root: HTMLElement, route: RouteKey): void {
  const defaultType: EnquiryType = route === 'enquiries-tour' ? 'tour' : 'contact';
  root.querySelector('#addEnquiryBtn')?.addEventListener('click', () => openEnquiryModal(undefined, defaultType));

  root.querySelector('#enqSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#enqStatusFilter')?.addEventListener('change', (e) => {
    statusFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-enq-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.enqPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-enq]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const enq = state.enquiries.find((item) => item.id === btn.dataset.editEnq);
      if (enq) openEnquiryModal(enq);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-enq]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const enq = state.enquiries.find((item) => item.id === btn.dataset.delEnq);
      if (!enq) return;
      const ok = await confirmDialog({
        title: 'Delete Enquiry',
        message: `Remove enquiry from ${enq.senderName}?`,
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deleteEnquiry(enq.id);
        showToast('Enquiry deleted.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete enquiry'), 'danger');
      }
    });
  });
}
