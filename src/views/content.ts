import { Modal } from 'bootstrap';
import { ASSET_IMAGES } from '../seed';
import { deleteCmsItem, saveCmsItem, state } from '../store';
import type { CmsItem, CmsSection, RouteKey } from '../types';
import {
  compressImageFile,
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
let lastSection: CmsSection | '' = '';

const ROUTE_TO_SECTION: Record<string, { section: CmsSection; title: string; subtitle: string }> = {
  'cms-homepage': {
    section: 'homepage',
    title: 'Manage Homepage Sections',
    subtitle: 'Control hero headlines, featured travel callouts, and homepage blocks.'
  },
  'cms-about': {
    section: 'about',
    title: 'Manage About Us',
    subtitle: 'Update Live The World’s Shimla origin story, mission, and team values.'
  },
  'cms-services': {
    section: 'services',
    title: 'Manage Services',
    subtitle: 'Configure Himalayan tour guides, adventure sports, mountain cabs, and stays.'
  },
  'cms-gallery': {
    section: 'gallery',
    title: 'Manage Travel Gallery',
    subtitle: 'Upload and curate expedition photography across Shimla, Manali, Kasol, and Spiti.'
  },
  'cms-testimonials': {
    section: 'testimonials',
    title: 'Manage Testimonials',
    subtitle: 'Publish verified guest reviews and expedition ratings.'
  },
  'cms-faqs': {
    section: 'faqs',
    title: 'Manage FAQs',
    subtitle: 'Edit traveler questions on permits, mountain weather, cabs, and cancellation.'
  },
  'cms-blog': {
    section: 'blog',
    title: 'Manage Blog Posts',
    subtitle: 'Author seasonal Himalayan travel guides and itinerary tips.'
  }
};

function openCmsModal(section: CmsSection, item?: CmsItem): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const isEdit = Boolean(item);
  let uploadedImage = item?.imageUrl || '';

  contentEl.innerHTML = `
    <form id="cmsForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? 'Edit Content Item' : 'Add Content Item'} · <span class="text-capitalize">${section}</span></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-8">
            <label class="form-label small fw-semibold">${section === 'faqs' ? 'Question *' : 'Title *'}</label>
            <input type="text" class="form-control" name="title" required minlength="2" maxlength="200" value="${escapeHtml(item?.title || '')}" />
            <div class="invalid-feedback">Please enter a title (at least 2 characters).</div>
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Status *</label>
            <select class="form-select" name="status">
              <option value="published" ${item?.status === 'published' || !item ? 'selected' : ''}>Published</option>
              <option value="draft" ${item?.status === 'draft' ? 'selected' : ''}>Draft</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Subtitle / Tagline</label>
            <input type="text" class="form-control" name="subtitle" maxlength="300" value="${escapeHtml(item?.subtitle || '')}" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Category</label>
            <input type="text" class="form-control" name="category" maxlength="80" value="${escapeHtml(item?.category || '')}" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Sort Order</label>
            <input type="number" class="form-control tabular-nums" name="sortOrder" min="0" max="10000" value="${item?.sortOrder ?? 1}" />
          </div>
          ${
            section === 'testimonials' || section === 'blog'
              ? `
            <div class="col-md-5">
              <label class="form-label small fw-semibold">Author Name</label>
              <input type="text" class="form-control" name="authorName" maxlength="120" value="${escapeHtml(item?.authorName || '')}" />
            </div>
            <div class="col-md-5">
              <label class="form-label small fw-semibold">Author Role / City</label>
              <input type="text" class="form-control" name="authorRole" maxlength="120" value="${escapeHtml(item?.authorRole || '')}" />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Rating</label>
              <select class="form-select" name="rating">
                ${[5, 4, 3, 2, 1].map((r) => `<option value="${r}" ${(item?.rating ?? 5) === r ? 'selected' : ''}>${r} ★</option>`).join('')}
              </select>
            </div>
          `
              : ''
          }
          <div class="col-12">
            <label class="form-label small fw-semibold">${section === 'faqs' ? 'Answer / Body' : 'Content Body'}</label>
            <textarea class="form-control" name="body" rows="4" maxlength="6000">${escapeHtml(item?.body || '')}</textarea>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Image Upload</label>
            <input type="file" class="form-control" id="cmsImageFile" accept="image/*" />
            <div class="d-flex flex-wrap gap-2 mt-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" data-cms-preset="${escapeHtml(ASSET_IMAGES.dharamshala)}">Dharamshala</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" data-cms-preset="${escapeHtml(ASSET_IMAGES.shimla)}">Shimla</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" data-cms-preset="${escapeHtml(ASSET_IMAGES.manali)}">Manali</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" data-cms-preset="${escapeHtml(ASSET_IMAGES.kasol)}">Kasol</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" data-cms-preset="${escapeHtml(ASSET_IMAGES.spiti)}">Spiti</button>
            </div>
          </div>
          <div class="col-12" id="cmsImagePreviewWrap" ${uploadedImage ? '' : 'style="display:none;"'}>
            <div class="d-inline-flex align-items-start gap-2">
              <img id="cmsImagePreview" src="${escapeHtml(uploadedImage)}" alt="Content preview" class="rounded border" style="max-height: 150px; object-fit: cover;" />
              <button type="button" class="btn btn-sm btn-outline-danger" id="clearCmsImageBtn" title="Remove image">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer border-top">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-ltw" id="saveCmsBtn">${isEdit ? 'Save Changes' : 'Create Item'}</button>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  const fileInput = contentEl.querySelector('#cmsImageFile') as HTMLInputElement;
  const previewImg = contentEl.querySelector('#cmsImagePreview') as HTMLImageElement;
  const previewWrap = contentEl.querySelector('#cmsImagePreviewWrap') as HTMLElement;
  const clearImgBtn = contentEl.querySelector('#clearCmsImageBtn') as HTMLButtonElement | null;

  const setImage = (url: string) => {
    uploadedImage = url;
    previewImg.src = url;
    previewWrap.style.display = url ? 'block' : 'none';
  };

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      setImage(await compressImageFile(file));
    } catch (err) {
      showToast(extractErrorMessage(err, 'Image upload failed'), 'danger');
    }
  });

  contentEl.querySelectorAll<HTMLElement>('[data-cms-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.cmsPreset || '';
      if (url) setImage(url);
    });
  });

  clearImgBtn?.addEventListener('click', () => {
    setImage('');
    if (fileInput) fileInput.value = '';
  });

  const form = contentEl.querySelector('#cmsForm') as HTMLFormElement;
  form.querySelectorAll<HTMLInputElement>('input[minlength]').forEach((el) => {
    el.addEventListener('input', () => el.setCustomValidity(''));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleEl = form.elements.namedItem('title') as HTMLInputElement | null;
    if (titleEl) titleEl.setCustomValidity(titleEl.value.trim().length < 2 ? 'Must be at least 2 characters.' : '');

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please complete all required content fields.', 'warning');
      return;
    }
    const fd = new FormData(form);
    const btn = contentEl.querySelector('#saveCmsBtn') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await saveCmsItem({
        id: item?.id,
        section,
        title: String(fd.get('title')).trim(),
        subtitle: String(fd.get('subtitle') || '').trim(),
        category: String(fd.get('category') || '').trim(),
        sortOrder: Number(fd.get('sortOrder') || 1),
        authorName: String(fd.get('authorName') || '').trim(),
        authorRole: String(fd.get('authorRole') || '').trim(),
        rating: Number(fd.get('rating') || 5),
        body: String(fd.get('body') || '').trim(),
        imageUrl: uploadedImage,
        status: String(fd.get('status')) as 'published' | 'draft'
      });
      modal.hide();
      showToast(isEdit ? 'Content updated.' : 'Content item added.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save content'), 'danger');
      btn.disabled = false;
    }
  });
}

export function renderContentView(route: RouteKey): string {
  const cfg = ROUTE_TO_SECTION[route] || ROUTE_TO_SECTION['cms-homepage'];
  if (lastSection !== cfg.section) {
    lastSection = cfg.section;
    currentPage = 1;
  }

  const allSectionItems = state.cmsItems.filter((c) => c.section === cfg.section);
  const filtered = allSectionItems.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.subtitle || '').toLowerCase().includes(q) ||
        (c.body || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.authorName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="mb-1 fw-bold">${cfg.title}</h4>
        <p class="text-muted small mb-0">${cfg.subtitle}</p>
      </div>
      <button type="button" class="btn btn-sm btn-ltw" id="addCmsBtn">
        <i class="bi bi-plus-lg me-1"></i>Add Item
      </button>
    </div>

    <div class="d-flex flex-wrap gap-1 mb-3">
      ${Object.entries(ROUTE_TO_SECTION)
        .map(
          ([r, meta]) => `
        <button type="button" class="btn btn-sm ${route === r ? 'btn-ltw' : 'btn-outline-secondary'}" data-route="${r}">
          ${escapeHtml(meta.title.replace('Manage ', ''))}
        </button>
      `
        )
        .join('')}
    </div>

    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-6">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="cmsSearchInput" placeholder="Search title, category, author, or text..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-md-4">
          <select class="form-select form-select-sm" id="cmsStatusFilter">
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="published" ${statusFilter === 'published' ? 'selected' : ''}>Published</option>
            <option value="draft" ${statusFilter === 'draft' ? 'selected' : ''}>Draft</option>
          </select>
        </div>
        <div class="col-md-2 text-md-end small text-muted tabular-nums">${filtered.length} entries</div>
      </div>
    </div>

    ${
      allSectionItems.length === 0
        ? `<div class="ltw-card p-5 text-center text-muted">
            <div class="mb-2">No items added under ${escapeHtml(cfg.section)} yet.</div>
            <button type="button" class="btn btn-sm btn-ltw" id="emptyAddCmsBtn">Create First Entry</button>
          </div>`
        : filtered.length === 0
        ? `<div class="ltw-card p-5 text-center text-muted">No entries match your search or status filter.</div>`
        : cfg.section === 'gallery'
        ? `<div class="row g-3">
            ${paged.slice
              .map(
                (it) => `
              <div class="col-sm-6 col-lg-4 col-xl-3">
                <div class="ltw-card overflow-hidden h-100 d-flex flex-column">
                  ${
                    it.imageUrl
                      ? `<img src="${escapeHtml(it.imageUrl)}" alt="${escapeHtml(it.title)}" class="ltw-media-card-img" referrerpolicy="no-referrer" />`
                      : `<div class="ltw-media-card-img d-flex align-items-center justify-content-center text-muted"><i class="bi bi-image fs-1"></i></div>`
                  }
                  <div class="p-3 d-flex flex-column justify-content-between flex-grow-1">
                    <div>
                      <div class="small text-muted">${escapeHtml(it.category || 'Gallery')} · ${renderStatusLabel(it.status)}</div>
                      <div class="fw-semibold small mt-1">${escapeHtml(it.title)}</div>
                    </div>
                    <div class="d-flex gap-1 mt-3">
                      <button type="button" class="btn btn-sm btn-outline-secondary flex-grow-1" data-edit-cms="${escapeHtml(it.id)}">Edit</button>
                      <button type="button" class="btn btn-sm btn-outline-danger" data-del-cms="${escapeHtml(it.id)}"><i class="bi bi-trash"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          ${
            paged.totalPages > 1
              ? `<div class="ltw-card p-3 mt-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span class="small text-muted">Page ${paged.currentPage} of ${paged.totalPages}</span>
                  ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-cms-page')}
                </div>`
              : ''
          }`
        : `<div class="ltw-card overflow-hidden">
            <div class="table-responsive">
              <table class="table ltw-table">
                <thead>
                  <tr>
                    <th>Title & Content</th>
                    <th>Category / Author</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${paged.slice
                    .map(
                      (it) => `
                    <tr>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          ${
                            it.imageUrl
                              ? `<img src="${escapeHtml(it.imageUrl)}" alt="${escapeHtml(it.title)}" class="ltw-thumb" referrerpolicy="no-referrer" />`
                              : ''
                          }
                          <div>
                            <div class="fw-semibold">${escapeHtml(it.title)}</div>
                            <div class="small text-muted text-truncate" style="max-width: 360px;">${escapeHtml(it.subtitle || it.body || '')}</div>
                          </div>
                        </div>
                      </td>
                      <td class="small">
                        <div>${escapeHtml(it.category || cfg.section)}</div>
                        ${it.authorName ? `<div class="text-muted">${escapeHtml(it.authorName)} (${it.rating || 5}★)</div>` : ''}
                      </td>
                      <td class="tabular-nums">${it.sortOrder ?? 1}</td>
                      <td>${renderStatusLabel(it.status)}</td>
                      <td class="text-end text-nowrap">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-cms="${escapeHtml(it.id)}"><i class="bi bi-pencil"></i></button>
                        <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-cms="${escapeHtml(it.id)}"><i class="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
            ${
              paged.totalPages > 1
                ? `<div class="p-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <span class="small text-muted">Page ${paged.currentPage} of ${paged.totalPages}</span>
                    ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-cms-page')}
                  </div>`
                : ''
            }
          </div>`
    }
  `;
}

export function bindContentEvents(root: HTMLElement, route: RouteKey): void {
  const cfg = ROUTE_TO_SECTION[route] || ROUTE_TO_SECTION['cms-homepage'];

  root.querySelector('#addCmsBtn')?.addEventListener('click', () => openCmsModal(cfg.section));
  root.querySelector('#emptyAddCmsBtn')?.addEventListener('click', () => openCmsModal(cfg.section));

  root.querySelector('#cmsSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#cmsStatusFilter')?.addEventListener('change', (e) => {
    statusFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-cms-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.cmsPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-cms]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = state.cmsItems.find((c) => c.id === btn.dataset.editCms);
      if (item) openCmsModal(item.section, item);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-cms]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = state.cmsItems.find((c) => c.id === btn.dataset.delCms);
      if (!item) return;
      const ok = await confirmDialog({
        title: 'Delete Content Item',
        message: `Remove "${item.title}" from ${item.section}?`,
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deleteCmsItem(item.id);
        showToast('Content item deleted.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete content'), 'danger');
      }
    });
  });
}
