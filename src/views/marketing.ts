import { Modal } from 'bootstrap';
import { deleteMarketingItem, saveMarketingItem, state } from '../store';
import type { MarketingItem, MarketingKind, RouteKey } from '../types';
import {
  confirmDialog,
  escapeHtml,
  extractErrorMessage,
  paginate,
  renderPaginationHtml,
  renderStatusLabel,
  showToast
} from '../utils/format';

let searchTerm = '';
let statusFilter = 'all';
let currentPage = 1;
let lastKind: MarketingKind | '' = '';

function openMarketingModal(kind: MarketingKind, item?: MarketingItem): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const isEdit = Boolean(item);
  const titleMap: Record<MarketingKind, string> = {
    seo_page: 'SEO Page Meta Configuration',
    banner: 'Promotional Banner',
    social_link: 'Social Media Link'
  };

  contentEl.innerHTML = `
    <form id="marketingForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? 'Edit' : 'Add'} ${titleMap[kind]}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          ${
            kind === 'seo_page'
              ? `
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Page Key / Route *</label>
              <input type="text" class="form-control" name="pageKey" required maxlength="80" value="${escapeHtml(item?.pageKey || 'homepage')}" placeholder="e.g. homepage, destinations, shimla" />
              <div class="invalid-feedback">Please enter a page key.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Canonical URL</label>
              <input type="url" class="form-control" name="url" maxlength="500" value="${escapeHtml(item?.url || 'https://livestheworld.com/')}" />
              <div class="invalid-feedback">Enter a valid URL starting with https:// or http://.</div>
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">Meta Title *</label>
              <input type="text" class="form-control" name="metaTitle" required maxlength="160" value="${escapeHtml(item?.metaTitle || '')}" />
              <div class="invalid-feedback">Please enter a meta title.</div>
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">Meta Description *</label>
              <textarea class="form-control" name="metaDescription" rows="3" required maxlength="320">${escapeHtml(item?.metaDescription || '')}</textarea>
              <div class="invalid-feedback">Please enter a meta description.</div>
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">SEO Keywords (comma-separated)</label>
              <input type="text" class="form-control" name="keywords" maxlength="300" value="${escapeHtml(item?.keywords || '')}" />
            </div>
          `
              : kind === 'banner'
              ? `
            <div class="col-12">
              <label class="form-label small fw-semibold">Banner Headline *</label>
              <input type="text" class="form-control" name="bannerTitle" required maxlength="160" value="${escapeHtml(item?.bannerTitle || '')}" />
              <div class="invalid-feedback">Please enter a banner headline.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">CTA Button Label</label>
              <input type="text" class="form-control" name="bannerCta" maxlength="80" value="${escapeHtml(item?.bannerCta || 'Explore Packages')}" />
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Destination URL</label>
              <input type="url" class="form-control" name="url" maxlength="500" value="${escapeHtml(item?.url || 'https://livestheworld.com/packages')}" />
              <div class="invalid-feedback">Enter a valid URL starting with https:// or http://.</div>
            </div>
          `
              : `
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Platform Name *</label>
              <input type="text" class="form-control" name="platform" required maxlength="60" value="${escapeHtml(item?.platform || '')}" placeholder="e.g. Instagram, YouTube, WhatsApp" />
              <div class="invalid-feedback">Please enter a platform name.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Profile / Channel URL *</label>
              <input type="url" class="form-control" name="url" required maxlength="500" value="${escapeHtml(item?.url || '')}" />
              <div class="invalid-feedback">Enter a valid URL starting with https:// or http://.</div>
            </div>
          `
          }
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Status</label>
            <select class="form-select" name="status">
              <option value="active" ${item?.status === 'active' || !item ? 'selected' : ''}>Active</option>
              <option value="inactive" ${item?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer border-top">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-ltw" id="saveMktBtn">${isEdit ? 'Save Changes' : 'Create Entry'}</button>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  const form = contentEl.querySelector('#marketingForm') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please complete all required marketing fields.', 'warning');
      return;
    }
    const fd = new FormData(form);
    const btn = contentEl.querySelector('#saveMktBtn') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await saveMarketingItem({
        id: item?.id,
        kind,
        pageKey: String(fd.get('pageKey') || item?.pageKey || '').trim(),
        metaTitle: String(fd.get('metaTitle') || '').trim(),
        metaDescription: String(fd.get('metaDescription') || '').trim(),
        keywords: String(fd.get('keywords') || '').trim(),
        bannerTitle: String(fd.get('bannerTitle') || '').trim(),
        bannerCta: String(fd.get('bannerCta') || '').trim(),
        platform: String(fd.get('platform') || '').trim(),
        url: String(fd.get('url') || '').trim(),
        status: String(fd.get('status')) as 'active' | 'inactive'
      });
      modal.hide();
      showToast('Marketing entry saved.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save entry'), 'danger');
      btn.disabled = false;
    }
  });
}

export function renderMarketingView(route: RouteKey): string {
  const kind: MarketingKind =
    route === 'marketing-banners' ? 'banner' : route === 'marketing-social' ? 'social_link' : 'seo_page';
  if (lastKind !== kind) {
    lastKind = kind;
    currentPage = 1;
  }

  const filtered = state.marketing.filter((m) => {
    if (m.kind !== kind) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (m.pageKey || '').toLowerCase().includes(q) ||
        (m.metaTitle || '').toLowerCase().includes(q) ||
        (m.metaDescription || '').toLowerCase().includes(q) ||
        (m.keywords || '').toLowerCase().includes(q) ||
        (m.bannerTitle || '').toLowerCase().includes(q) ||
        (m.platform || '').toLowerCase().includes(q) ||
        (m.url || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  const headings: Record<MarketingKind, { title: string; desc: string; btn: string }> = {
    seo_page: {
      title: 'Website Meta Titles & SEO Keywords',
      desc: 'Configure page-level meta titles, meta descriptions, and search keywords for livestheworld.com.',
      btn: 'Add SEO Page'
    },
    banner: {
      title: 'Promotional Banners',
      desc: 'Manage seasonal campaign announcements and call-to-action banners.',
      btn: 'Add Banner'
    },
    social_link: {
      title: 'Social Media Links',
      desc: 'Control official Instagram, Facebook, YouTube, and WhatsApp links across the website.',
      btn: 'Add Social Link'
    }
  };

  const h = headings[kind];

  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="mb-1 fw-bold">${h.title}</h4>
        <p class="text-muted small mb-0">${h.desc}</p>
      </div>
      <button type="button" class="btn btn-sm btn-ltw" id="addMktBtn">
        <i class="bi bi-plus-lg me-1"></i>${h.btn}
      </button>
    </div>

    <div class="d-flex flex-wrap gap-1 mb-3">
      <button type="button" class="btn btn-sm ${kind === 'seo_page' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="marketing-seo">SEO Metadata</button>
      <button type="button" class="btn btn-sm ${kind === 'banner' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="marketing-banners">Promotional Banners</button>
      <button type="button" class="btn btn-sm ${kind === 'social_link' ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="marketing-social">Social Links</button>
    </div>

    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-6">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="mktSearchInput" placeholder="Search title, URL, keywords, or platform..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-md-4">
          <select class="form-select form-select-sm" id="mktStatusFilter">
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="col-md-2 text-md-end small text-muted tabular-nums">${filtered.length} entries</div>
      </div>
    </div>

    <div class="ltw-card overflow-hidden">
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>${kind === 'seo_page' ? 'Page / Meta Title' : kind === 'banner' ? 'Banner Headline' : 'Platform'}</th>
              <th>${kind === 'seo_page' ? 'Meta Description & Keywords' : kind === 'banner' ? 'CTA & Target URL' : 'URL'}</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              paged.slice.length === 0
                ? `<tr><td colspan="4" class="text-center py-5 text-muted">No entries match your filter.</td></tr>`
                : paged.slice
                    .map(
                      (m) => `
                  <tr>
                    <td>
                      <div class="fw-semibold">${escapeHtml(m.metaTitle || m.bannerTitle || m.platform || m.pageKey)}</div>
                      ${m.pageKey && kind === 'seo_page' ? `<div class="small text-muted font-mono-num">/${escapeHtml(m.pageKey)}</div>` : ''}
                    </td>
                    <td class="small">
                      ${
                        kind === 'seo_page'
                          ? `<div>${escapeHtml(m.metaDescription || '')}</div><div class="text-muted mt-1">${escapeHtml(m.keywords || '')}</div>`
                          : `<div>${escapeHtml(m.bannerCta || '')}</div><div class="text-muted text-truncate" style="max-width: 340px;">${escapeHtml(m.url || '')}</div>`
                      }
                    </td>
                    <td>${renderStatusLabel(m.status)}</td>
                    <td class="text-end text-nowrap">
                      <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-mkt="${escapeHtml(m.id)}"><i class="bi bi-pencil"></i></button>
                      <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-mkt="${escapeHtml(m.id)}"><i class="bi bi-trash"></i></button>
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
              ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-mkt-page')}
            </div>`
          : ''
      }
    </div>
  `;
}

export function bindMarketingEvents(root: HTMLElement, route: RouteKey): void {
  const kind: MarketingKind =
    route === 'marketing-banners' ? 'banner' : route === 'marketing-social' ? 'social_link' : 'seo_page';

  root.querySelector('#addMktBtn')?.addEventListener('click', () => openMarketingModal(kind));

  root.querySelector('#mktSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#mktStatusFilter')?.addEventListener('change', (e) => {
    statusFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-mkt-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.mktPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-mkt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = state.marketing.find((m) => m.id === btn.dataset.editMkt);
      if (item) openMarketingModal(item.kind, item);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-mkt]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = state.marketing.find((m) => m.id === btn.dataset.delMkt);
      if (!item) return;
      const ok = await confirmDialog({
        title: 'Delete Marketing Entry',
        message: 'Remove this SEO / marketing entry?',
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deleteMarketingItem(item.id);
        showToast('Entry deleted.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete entry'), 'danger');
      }
    });
  });
}
