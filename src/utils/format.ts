import { Toast, Modal } from 'bootstrap';

export function escapeHtml(input: unknown): string {
  const str = String(input ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'INR',
      maximumFractionDigits: 0
    }).format(num);
  } catch {
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  }
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  } else if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    date = (value as { toDate: () => Date }).toDate();
  } else if (typeof value === 'object' && value !== null && 'seconds' in value) {
    date = new Date(Number((value as { seconds: number }).seconds) * 1000);
  }
  if (!date) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function toDateInputValue(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return '';
}

export function getTimestampMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  return 0;
}

export function showToast(message: string, variant: 'success' | 'danger' | 'warning' | 'info' = 'success'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    danger: 'bi-exclamation-octagon-fill text-danger',
    warning: 'bi-exclamation-triangle-fill text-warning',
    info: 'bi-info-circle-fill text-primary'
  };

  const el = document.createElement('div');
  el.className = 'toast align-items-center border shadow-sm';
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.setAttribute('aria-atomic', 'true');
  el.innerHTML = `
    <div class="d-flex align-items-center px-3 py-2 gap-2">
      <i class="bi ${iconMap[variant]} fs-5"></i>
      <div class="toast-body p-0 flex-grow-1 small fw-medium">${escapeHtml(message)}</div>
      <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  container.appendChild(el);
  const toast = new Toast(el, { delay: 3600 });
  el.addEventListener('hidden.bs.toast', () => el.remove());
  toast.show();
}

export function extractErrorMessage(err: unknown, fallback = 'Operation failed.'): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message || fallback;
  if (msg.startsWith('{')) {
    try {
      const parsed = JSON.parse(msg) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // ignore JSON parse failure
    }
  }
  return msg;
}

export function confirmDialog(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
}): Promise<boolean> {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('confirmActionModal');
    if (!modalEl) {
      resolve(false);
      return;
    }
    const titleEl = modalEl.querySelector('#confirmModalTitle');
    const bodyEl = modalEl.querySelector('#confirmModalBody');
    const okBtn = modalEl.querySelector('#confirmModalBtn') as HTMLButtonElement | null;
    if (!titleEl || !bodyEl || !okBtn) {
      resolve(false);
      return;
    }

    titleEl.textContent = options.title;
    bodyEl.textContent = options.message;
    okBtn.textContent = options.confirmLabel ?? 'Confirm';
    okBtn.className = `btn btn-${options.confirmVariant ?? 'danger'} px-4`;

    let settled = false;
    const modal = Modal.getOrCreateInstance(modalEl);

    const onConfirm = () => {
      settled = true;
      modal.hide();
      cleanup();
      resolve(true);
    };

    const onHidden = () => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(false);
      }
    };

    const cleanup = () => {
      okBtn.removeEventListener('click', onConfirm);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    okBtn.addEventListener('click', onConfirm);
    modalEl.addEventListener('hidden.bs.modal', onHidden);
    modal.show();
  });
}

export async function compressImageFile(file: File, maxWidth = 800, quality = 0.75): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
      const canvas = document.createElement('canvas');
      let width = Math.round(img.width * scale);
      let height = Math.round(img.height * scale);
      let q = quality;
      let compressed = '';

      for (let attempt = 0; attempt < 4; attempt++) {
        canvas.width = Math.max(120, width);
        canvas.height = Math.max(90, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        compressed = canvas.toDataURL('image/jpeg', q);
        if (compressed.length <= 220000) break;
        width = Math.round(width * 0.75);
        height = Math.round(height * 0.75);
        q = Math.max(0.45, q - 0.1);
      }

      if (compressed.length > 245000) {
        reject(new Error('Image is still too large after compression. Please choose a smaller photo.'));
        return;
      }
      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Invalid image content.'));
    img.src = dataUrl;
  });
}

export function exportRowsToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent = [
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function paginate<T>(items: T[], page: number, pageSize = 8): {
  slice: T[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
} {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    slice: items.slice(start, start + pageSize),
    totalPages,
    currentPage,
    totalItems
  };
}

export function renderPaginationHtml(currentPage: number, totalPages: number, targetAttr = 'data-page'): string {
  if (totalPages <= 1) return '';
  const pages: string[] = [];
  for (let p = 1; p <= totalPages; p++) {
    pages.push(`
      <li class="page-item ${p === currentPage ? 'active' : ''}">
        <button class="page-link" type="button" ${targetAttr}="${p}">${p}</button>
      </li>
    `);
  }
  return `
    <nav aria-label="Table pagination">
      <ul class="pagination pagination-sm mb-0 flex-wrap">
        <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
          <button class="page-link" type="button" ${targetAttr}="${Math.max(1, currentPage - 1)}" aria-label="Previous">
            <i class="bi bi-chevron-left"></i>
          </button>
        </li>
        ${pages.join('')}
        <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
          <button class="page-link" type="button" ${targetAttr}="${Math.min(totalPages, currentPage + 1)}" aria-label="Next">
            <i class="bi bi-chevron-right"></i>
          </button>
        </li>
      </ul>
    </nav>
  `;
}

export function renderStatusLabel(status: string): string {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    confirmed: { label: 'Confirmed', cls: 'status-success', icon: 'bi-check-circle' },
    completed: { label: 'Completed', cls: 'status-info', icon: 'bi-check2-all' },
    pending: { label: 'Pending', cls: 'status-warning', icon: 'bi-clock' },
    partial: { label: 'Partial Paid', cls: 'status-warning', icon: 'bi-pie-chart' },
    paid: { label: 'Paid', cls: 'status-success', icon: 'bi-credit-card-2-front' },
    cancelled: { label: 'Cancelled', cls: 'status-danger', icon: 'bi-x-circle' },
    refunded: { label: 'Refunded', cls: 'status-neutral', icon: 'bi-arrow-return-left' },
    failed: { label: 'Failed', cls: 'status-danger', icon: 'bi-exclamation-circle' },
    active: { label: 'Active', cls: 'status-success', icon: 'bi-check-circle' },
    published: { label: 'Published', cls: 'status-success', icon: 'bi-globe2' },
    draft: { label: 'Draft', cls: 'status-neutral', icon: 'bi-file-earmark' },
    archived: { label: 'Archived', cls: 'status-neutral', icon: 'bi-archive' },
    vip: { label: 'VIP Traveler', cls: 'status-info', icon: 'bi-star' },
    inactive: { label: 'Inactive', cls: 'status-neutral', icon: 'bi-pause-circle' },
    available: { label: 'Available', cls: 'status-success', icon: 'bi-check-circle' },
    on_trip: { label: 'On Trip', cls: 'status-warning', icon: 'bi-geo-alt' },
    maintenance: { label: 'Maintenance', cls: 'status-danger', icon: 'bi-wrench' },
    new: { label: 'New', cls: 'status-info', icon: 'bi-envelope' },
    in_progress: { label: 'In Progress', cls: 'status-warning', icon: 'bi-hourglass-split' },
    resolved: { label: 'Resolved', cls: 'status-success', icon: 'bi-check2-circle' },
    closed: { label: 'Closed', cls: 'status-neutral', icon: 'bi-lock' },
    suspended: { label: 'Suspended', cls: 'status-danger', icon: 'bi-slash-circle' }
  };
  const cfg = map[status] ?? { label: status, cls: 'status-neutral', icon: 'bi-dot' };
  return `<span class="status-text ${cfg.cls}"><i class="bi ${cfg.icon} me-1"></i>${escapeHtml(cfg.label)}</span>`;
}
