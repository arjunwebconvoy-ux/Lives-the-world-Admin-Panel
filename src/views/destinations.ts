import { Modal } from 'bootstrap';
import { ASSET_IMAGES } from '../seed';
import { deleteDestination, navigateTo, saveDestination, state } from '../store';
import type { Destination, DestinationCategory, PublishLifecycle, RouteKey } from '../types';
import {
  compressImageFile,
  confirmDialog,
  escapeHtml,
  extractErrorMessage,
  formatDate,
  paginate,
  renderPaginationHtml,
  renderStatusLabel,
  showToast,
  slugify
} from '../utils/format';

let searchTerm = '';
let categoryFilter = 'all';
let currentPage = 1;
let lastAddedDestination: { id: string; name: string } | null = null;

const CATEGORIES: DestinationCategory[] = [
  'Hill Station',
  'Adventure Hub',
  'Riverside & Trek',
  'High-Altitude Expedition',
  'Spiritual & Heritage'
];

interface DestinationDraft {
  name: string;
  slug: string;
  region: string;
  category: DestinationCategory;
  bestSeason: string;
  elevation: string;
  status: PublishLifecycle;
  shortDescription: string;
  description: string;
  featured: boolean;
  imageUrl: string;
}

function createEmptyDraft(): DestinationDraft {
  return {
    name: '',
    slug: '',
    region: '',
    category: 'Hill Station',
    bestSeason: '',
    elevation: '',
    status: 'active',
    shortDescription: '',
    description: '',
    featured: false,
    imageUrl: ''
  };
}

let addPageDraft: DestinationDraft = createEmptyDraft();

function renderDestinationFormFields(values: DestinationDraft): string {
  return `
    <div class="row g-3">
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="destNameInput">Destination Name *</label>
        <input type="text" class="form-control" id="destNameInput" name="name" required minlength="2" maxlength="120" value="${escapeHtml(values.name)}" placeholder="e.g. Shimla & Mashobra" />
        <div class="invalid-feedback">Please enter a destination name (at least 2 characters).</div>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="destSlugInput">URL Slug</label>
        <input type="text" class="form-control" id="destSlugInput" name="slug" maxlength="120" value="${escapeHtml(values.slug)}" placeholder="auto-generated if empty" />
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="destRegionInput">Region / State *</label>
        <input type="text" class="form-control" id="destRegionInput" name="region" required minlength="2" maxlength="120" value="${escapeHtml(values.region)}" placeholder="e.g. Himachal Pradesh" />
        <div class="invalid-feedback">Please enter a region or state (at least 2 characters).</div>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="destCategorySelect">Category *</label>
        <select class="form-select" id="destCategorySelect" name="category" required>
          ${CATEGORIES.map((c) => `<option value="${c}" ${values.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold" for="destSeasonInput">Best Season</label>
        <input type="text" class="form-control" id="destSeasonInput" name="bestSeason" maxlength="100" value="${escapeHtml(values.bestSeason)}" placeholder="e.g. March – June" />
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold" for="destElevationInput">Elevation</label>
        <input type="text" class="form-control" id="destElevationInput" name="elevation" maxlength="60" value="${escapeHtml(values.elevation)}" placeholder="e.g. 2,276 m" />
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label small fw-semibold" for="destStatusSelect">Status *</label>
        <select class="form-select" id="destStatusSelect" name="status">
          <option value="active" ${values.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="draft" ${values.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="archived" ${values.status === 'archived' ? 'selected' : ''}>Archived</option>
        </select>
      </div>
      <div class="col-12">
        <label class="form-label small fw-semibold" for="destShortDescInput">Short Summary *</label>
        <input type="text" class="form-control" id="destShortDescInput" name="shortDescription" required minlength="2" maxlength="300" value="${escapeHtml(values.shortDescription)}" placeholder="One-line highlight shown on destination cards" />
        <div class="invalid-feedback">Please enter a short summary (at least 2 characters).</div>
      </div>
      <div class="col-12">
        <label class="form-label small fw-semibold" for="destDescInput">Full Description *</label>
        <textarea class="form-control" id="destDescInput" name="description" rows="4" required minlength="2" maxlength="4000" placeholder="Detailed overview of attractions, routes, and highlights">${escapeHtml(values.description)}</textarea>
        <div class="invalid-feedback">Please enter a full description (at least 2 characters).</div>
      </div>
      <div class="col-12 col-lg-8">
        <label class="form-label small fw-semibold" for="destImageFile">Upload Cover Image</label>
        <input type="file" class="form-control" id="destImageFile" accept="image/*" />
        <div class="form-text">Automatically resized and optimized for cloud storage, or pick a quick preset below.</div>
        <div class="d-flex flex-wrap gap-2 mt-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" data-dest-preset="${escapeHtml(ASSET_IMAGES.dharamshala)}">Dharamshala</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-dest-preset="${escapeHtml(ASSET_IMAGES.shimla)}">Shimla</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-dest-preset="${escapeHtml(ASSET_IMAGES.manali)}">Manali</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-dest-preset="${escapeHtml(ASSET_IMAGES.kasol)}">Kasol</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-dest-preset="${escapeHtml(ASSET_IMAGES.spiti)}">Spiti</button>
        </div>
      </div>
      <div class="col-12 col-lg-4 d-flex align-items-lg-end">
        <div class="form-check mt-1 mt-lg-0 mb-lg-2">
          <input class="form-check-input" type="checkbox" id="destFeaturedCheck" name="featured" ${values.featured ? 'checked' : ''} />
          <label class="form-check-label small fw-semibold" for="destFeaturedCheck">Featured on Homepage</label>
        </div>
      </div>
      <div class="col-12" id="destImagePreviewWrap" ${values.imageUrl ? '' : 'style="display:none;"'}>
        <div class="d-inline-flex align-items-start gap-2 max-w-100">
          <img id="destImagePreview" src="${escapeHtml(values.imageUrl)}" alt="Destination preview" class="img-fluid rounded border" style="max-height: 170px; object-fit: cover;" />
          <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" id="clearDestImageBtn" title="Remove image">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindDestinationForm(
  container: HTMLElement,
  dest: Destination | undefined,
  options: {
    initialImage: string;
    syncDraft?: boolean;
    onSuccess: () => void;
  }
): void {
  const isEdit = Boolean(dest);
  let uploadedImage = options.initialImage;

  const form = container.querySelector('#destinationForm') as HTMLFormElement | null;
  if (!form) return;

  const fileInput = container.querySelector('#destImageFile') as HTMLInputElement | null;
  const previewImg = container.querySelector('#destImagePreview') as HTMLImageElement | null;
  const previewWrap = container.querySelector('#destImagePreviewWrap') as HTMLElement | null;
  const clearImgBtn = container.querySelector('#clearDestImageBtn') as HTMLButtonElement | null;

  const setImage = (url: string) => {
    uploadedImage = url;
    if (options.syncDraft) addPageDraft.imageUrl = url;
    if (previewImg && previewWrap) {
      previewImg.src = url;
      previewWrap.style.display = url ? 'block' : 'none';
    }
  };

  if (options.syncDraft) {
    const syncFields = () => {
      const fd = new FormData(form);
      addPageDraft = {
        name: String(fd.get('name') || ''),
        slug: String(fd.get('slug') || ''),
        region: String(fd.get('region') || ''),
        category: String(fd.get('category') || 'Hill Station') as DestinationCategory,
        bestSeason: String(fd.get('bestSeason') || ''),
        elevation: String(fd.get('elevation') || ''),
        status: String(fd.get('status') || 'active') as PublishLifecycle,
        shortDescription: String(fd.get('shortDescription') || ''),
        description: String(fd.get('description') || ''),
        featured: form.querySelector<HTMLInputElement>('#destFeaturedCheck')?.checked ?? false,
        imageUrl: uploadedImage
      };
    };
    form.addEventListener('input', syncFields);
    form.addEventListener('change', syncFields);
  }

  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[minlength], textarea[minlength]').forEach((el) => {
    el.addEventListener('input', () => el.setCustomValidity(''));
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setImage(compressed);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Image upload failed'), 'danger');
    }
  });

  container.querySelectorAll<HTMLElement>('[data-dest-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.destPreset || '';
      if (url) setImage(url);
    });
  });

  clearImgBtn?.addEventListener('click', () => {
    setImage('');
    if (fileInput) fileInput.value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const trimmedTargets = ['name', 'region', 'shortDescription', 'description'] as const;
    for (const fieldName of trimmedTargets) {
      const el = form.elements.namedItem(fieldName) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && el.value.trim().length < 2) {
        el.setCustomValidity('Must be at least 2 characters.');
      } else if (el) {
        el.setCustomValidity('');
      }
    }

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please complete all required fields.', 'warning');
      return;
    }

    const fd = new FormData(form);
    const btn = container.querySelector('#saveDestBtn') as HTMLButtonElement | null;
    const originalHtml = btn?.innerHTML || '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>${isEdit ? 'Saving...' : 'Creating...'}`;
    }

    try {
      const rawName = String(fd.get('name') || '').trim();
      const rawSlug = String(fd.get('slug') || '').trim();
      const savedId = await saveDestination({
        id: dest?.id,
        name: rawName,
        slug: rawSlug || slugify(rawName),
        region: String(fd.get('region') || '').trim(),
        category: String(fd.get('category')) as DestinationCategory,
        shortDescription: String(fd.get('shortDescription') || '').trim(),
        description: String(fd.get('description') || '').trim(),
        bestSeason: String(fd.get('bestSeason') || '').trim(),
        elevation: String(fd.get('elevation') || '').trim(),
        imageUrl: uploadedImage,
        featured: form.querySelector<HTMLInputElement>('#destFeaturedCheck')?.checked ?? false,
        status: String(fd.get('status')) as PublishLifecycle
      });

      if (!isEdit) {
        searchTerm = '';
        categoryFilter = 'all';
        currentPage = 1;
        addPageDraft = createEmptyDraft();
        lastAddedDestination = { id: savedId, name: rawName };
      }
      options.onSuccess();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(isEdit ? 'Destination updated.' : `Destination "${rawName}" added to Manage Destinations.`);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to save destination.'), 'danger');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  });
}

export function openDestinationDetailModal(dest: Destination): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const linkedPackages = state.packages.filter((p) => p.destinationId === dest.id);

  contentEl.innerHTML = `
    <div class="modal-header border-bottom">
      <h5 class="modal-title fw-bold text-truncate pe-2">${escapeHtml(dest.name)}</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>
    <div class="modal-body">
      ${
        dest.imageUrl
          ? `<img src="${escapeHtml(dest.imageUrl)}" alt="${escapeHtml(dest.name)}" class="w-100 rounded border mb-3" style="max-height: 220px; object-fit: cover;" referrerpolicy="no-referrer" />`
          : ''
      }
      <div class="row g-3 small mb-3">
        <div class="col-12 col-sm-6">
          <div class="text-muted">Region / State</div>
          <div class="fw-semibold">${escapeHtml(dest.region)}</div>
        </div>
        <div class="col-12 col-sm-6">
          <div class="text-muted">Category</div>
          <div class="fw-semibold">${escapeHtml(dest.category)}</div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="text-muted">Best Season</div>
          <div class="fw-semibold">${escapeHtml(dest.bestSeason || 'All year')}</div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="text-muted">Elevation</div>
          <div class="fw-semibold">${escapeHtml(dest.elevation || '—')}</div>
        </div>
        <div class="col-12 col-sm-4">
          <div class="text-muted">Status</div>
          <div>${renderStatusLabel(dest.status)}</div>
        </div>
        <div class="col-12">
          <div class="text-muted">URL Slug</div>
          <div class="font-mono-num text-break">${escapeHtml(dest.slug)}</div>
        </div>
        <div class="col-12">
          <div class="text-muted">Short Summary</div>
          <div class="fw-medium">${escapeHtml(dest.shortDescription)}</div>
        </div>
        <div class="col-12">
          <div class="text-muted">Full Description</div>
          <div>${escapeHtml(dest.description)}</div>
        </div>
        <div class="col-12">
          <div class="text-muted">Linked Tour Packages (${linkedPackages.length})</div>
          <div class="fw-medium">${linkedPackages.length ? linkedPackages.map((p) => escapeHtml(p.title)).join(', ') : 'None assigned yet'}</div>
        </div>
      </div>
    </div>
    <div class="modal-footer border-top">
      <div class="ltw-modal-actions d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-ltw" id="editFromViewDestBtn">
          <i class="bi bi-pencil me-1"></i>Edit Destination
        </button>
      </div>
    </div>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  contentEl.querySelector('#editFromViewDestBtn')?.addEventListener('click', () => {
    openDestinationModal(dest);
  });
}

export function openDestinationModal(dest?: Destination): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const isEdit = Boolean(dest);
  const draft: DestinationDraft = dest
    ? {
        name: dest.name || '',
        slug: dest.slug || '',
        region: dest.region || '',
        category: dest.category || 'Hill Station',
        bestSeason: dest.bestSeason || '',
        elevation: dest.elevation || '',
        status: dest.status || 'active',
        shortDescription: dest.shortDescription || '',
        description: dest.description || '',
        featured: Boolean(dest.featured),
        imageUrl: dest.imageUrl || ''
      }
    : createEmptyDraft();

  contentEl.innerHTML = `
    <form id="destinationForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? 'Edit Destination' : 'Add Destination'}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        ${renderDestinationFormFields(draft)}
      </div>
      <div class="modal-footer border-top">
        <div class="ltw-modal-actions d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-ltw" id="saveDestBtn">${isEdit ? 'Save Changes' : 'Create Destination'}</button>
        </div>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  bindDestinationForm(contentEl, dest, {
    initialImage: draft.imageUrl,
    onSuccess: () => {
      modal.hide();
      if (state.activeRoute !== 'destinations-manage') {
        navigateTo('destinations-manage');
      }
    }
  });
}

export function renderDestinationsView(route: RouteKey): string {
  if (route === 'destinations-add') {
    const recentDests = state.destinations.slice(0, 8);
    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Add Destination</h4>
          <p class="text-muted small mb-0">Publish a new Himalayan destination to your Live The World catalog.</p>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary ltw-mobile-full" id="backToManageDestBtn">
          <i class="bi bi-list-ul me-1"></i>Manage Destinations (${state.destinations.length})
        </button>
      </div>

      <div class="ltw-card p-3 p-sm-4 mb-4">
        <form id="destinationForm" novalidate>
          ${renderDestinationFormFields(addPageDraft)}
          <div class="d-grid d-sm-flex justify-content-sm-end gap-2 border-top pt-3 mt-4">
            <button type="button" class="btn btn-outline-secondary" id="resetAddDestBtn">Reset Form</button>
            <button type="submit" class="btn btn-ltw" id="saveDestBtn">
              <i class="bi bi-check2-circle me-1"></i>Create Destination
            </button>
          </div>
        </form>
      </div>

      <div class="ltw-card overflow-hidden">
        <div class="p-3 p-sm-4 border-bottom d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
          <div>
            <h6 class="fw-semibold mb-0">Recently Saved Destinations (${state.destinations.length} Total)</h6>
            <div class="small text-muted">New destinations are validated on the backend and synced directly to Cloud Firestore.</div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary ltw-mobile-full" id="viewAllFromAddDestBtn">View All</button>
        </div>

        <div class="d-md-none">
          ${
            recentDests.length === 0
              ? `<div class="p-4 text-center text-muted small">No destinations saved yet.</div>`
              : `<div>
                  ${recentDests
                    .map(
                      (d) => `
                    <div class="p-3 border-bottom">
                      <div class="d-flex align-items-start justify-content-between gap-2 mb-1">
                        <div class="fw-semibold">${escapeHtml(d.name)}</div>
                        ${renderStatusLabel(d.status)}
                      </div>
                      <div class="small text-muted">${escapeHtml(d.region)} · ${escapeHtml(d.category)}</div>
                      <div class="small text-muted mt-1">Created: ${formatDate(d.createdAt)}</div>
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
                <th>Destination</th>
                <th>Region</th>
                <th>Category</th>
                <th>Status</th>
                <th class="text-end">Created</th>
              </tr>
            </thead>
            <tbody>
              ${
                recentDests.length === 0
                  ? `<tr><td colspan="5" class="text-center py-4 text-muted">No destinations saved yet.</td></tr>`
                  : recentDests
                      .map(
                        (d) => `
                    <tr>
                      <td class="fw-semibold">${escapeHtml(d.name)}</td>
                      <td>${escapeHtml(d.region)}</td>
                      <td>${escapeHtml(d.category)}</td>
                      <td>${renderStatusLabel(d.status)}</td>
                      <td class="text-end small text-muted">${formatDate(d.createdAt)}</td>
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

  if (route === 'destinations-categories') {
    const rows = CATEGORIES.map((cat) => {
      const dests = state.destinations.filter((d) => d.category === cat);
      const pkgs = state.packages.filter((p) => dests.some((d) => d.id === p.destinationId));
      return { cat, destCount: dests.length, pkgCount: pkgs.length, activeCount: dests.filter((d) => d.status === 'active').length };
    });

    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Destination Categories</h4>
          <p class="text-muted small mb-0">Browse Himalayan regions grouped by travel style and terrain category.</p>
        </div>
        <button type="button" class="btn btn-sm btn-ltw ltw-mobile-full" id="openNewDestFromCat">
          <i class="bi bi-plus-lg me-1"></i>Add Destination
        </button>
      </div>
      <div class="row g-3">
        ${rows
          .map(
            (r) => `
          <div class="col-12 col-md-6 col-xl-4">
            <div class="ltw-card p-3 p-sm-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <div class="fw-semibold fs-6 mb-1">${escapeHtml(r.cat)}</div>
                <div class="small text-muted mb-3">${r.activeCount} active destinations · ${r.pkgCount} linked tour packages</div>
              </div>
              <div class="d-flex align-items-center justify-content-between border-top pt-3">
                <span class="tabular-nums fw-bold">${r.destCount} Destinations</span>
                <button type="button" class="btn btn-sm btn-outline-secondary" data-filter-dest-cat="${escapeHtml(r.cat)}">Filter List</button>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  const filtered = state.destinations.filter((d) => {
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  return `
    <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
      <div>
        <h4 class="mb-1 fw-bold">Manage Destinations</h4>
        <p class="text-muted small mb-0">Add, edit, categorize, and feature Himalayan destinations on Live The World.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary flex-fill flex-sm-grow-0" id="goAddDestPageBtn">
          <i class="bi bi-file-earmark-plus me-1"></i>Full Form
        </button>
        <button type="button" class="btn btn-sm btn-ltw flex-fill flex-sm-grow-0" id="addDestinationBtn">
          <i class="bi bi-plus-lg me-1"></i>Add Destination
        </button>
      </div>
    </div>

    ${
      lastAddedDestination
        ? `<div class="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between gap-2 mb-3" role="alert">
            <div class="small">
              <i class="bi bi-check-circle-fill me-2"></i>
              <strong>${escapeHtml(lastAddedDestination.name)}</strong> was saved to Firestore and appears at the top of the destinations table below.
            </div>
            <button type="button" class="btn-close" id="dismissAddedDestAlert" aria-label="Close"></button>
          </div>`
        : ''
    }

    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-12 col-sm-6">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="destSearchInput" placeholder="Search destinations or regions..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-8 col-sm-4">
          <select class="form-select form-select-sm" id="destCatFilter">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${CATEGORIES.map((c) => `<option value="${c}" ${categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="col-4 col-sm-2 text-end small text-muted tabular-nums">
          ${filtered.length} total
        </div>
      </div>
    </div>

    <div class="ltw-card overflow-hidden">
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>Destination</th>
              <th>Region</th>
              <th>Category</th>
              <th>Season / Elevation</th>
              <th>Packages</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              paged.slice.length === 0
                ? `<tr><td colspan="7" class="text-center py-5 text-muted">No destinations found. Click "Add Destination" to create one.</td></tr>`
                : paged.slice
                    .map((d) => {
                      const pkgCount = state.packages.filter((p) => p.destinationId === d.id).length;
                      const isJustAdded = lastAddedDestination?.id === d.id;
                      return `
                        <tr class="${isJustAdded ? 'table-success' : ''}">
                          <td>
                            <div class="d-flex align-items-center gap-2">
                              ${
                                d.imageUrl
                                  ? `<img src="${escapeHtml(d.imageUrl)}" alt="${escapeHtml(d.name)}" class="ltw-thumb" referrerpolicy="no-referrer" />`
                                  : `<div class="ltw-thumb d-flex align-items-center justify-content-center text-muted"><i class="bi bi-image"></i></div>`
                              }
                              <div>
                                <div class="fw-semibold">${escapeHtml(d.name)} ${d.featured ? '<i class="bi bi-star-fill text-warning small ms-1" title="Featured"></i>' : ''}</div>
                                <div class="small text-muted text-truncate" style="max-width: 240px;">${escapeHtml(d.shortDescription)}</div>
                              </div>
                            </div>
                          </td>
                          <td>${escapeHtml(d.region)}</td>
                          <td>${escapeHtml(d.category)}</td>
                          <td class="small">
                            <div>${escapeHtml(d.bestSeason || 'All year')}</div>
                            <div class="text-muted">${escapeHtml(d.elevation || '—')}</div>
                          </td>
                          <td class="tabular-nums fw-medium">${pkgCount}</td>
                          <td>${renderStatusLabel(d.status)}</td>
                          <td class="text-end text-nowrap">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-view-dest="${escapeHtml(d.id)}" title="View Details">
                              <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary ms-1" data-edit-dest="${escapeHtml(d.id)}" title="Edit">
                              <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-dest="${escapeHtml(d.id)}" title="Delete">
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
              ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-dest-page')}
            </div>`
          : ''
      }
    </div>
  `;
}

export function bindDestinationsEvents(root: HTMLElement, route: RouteKey): void {
  if (route === 'destinations-add') {
    root.querySelector('#backToManageDestBtn')?.addEventListener('click', () => navigateTo('destinations-manage'));
    root.querySelector('#viewAllFromAddDestBtn')?.addEventListener('click', () => navigateTo('destinations-manage'));
    root.querySelector('#resetAddDestBtn')?.addEventListener('click', () => {
      addPageDraft = createEmptyDraft();
      import('../store').then((m) => m.emit());
    });
    bindDestinationForm(root, undefined, {
      initialImage: addPageDraft.imageUrl,
      syncDraft: true,
      onSuccess: () => {
        navigateTo('destinations-manage');
      }
    });
    return;
  }

  root.querySelector('#dismissAddedDestAlert')?.addEventListener('click', () => {
    lastAddedDestination = null;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#goAddDestPageBtn')?.addEventListener('click', () => navigateTo('destinations-add'));
  root.querySelector('#addDestinationBtn')?.addEventListener('click', () => openDestinationModal());
  root.querySelector('#openNewDestFromCat')?.addEventListener('click', () => openDestinationModal());

  root.querySelectorAll<HTMLElement>('[data-filter-dest-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryFilter = btn.dataset.filterDestCat || 'all';
      currentPage = 1;
      navigateTo('destinations-manage');
    });
  });

  root.querySelector('#destSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#destCatFilter')?.addEventListener('change', (e) => {
    categoryFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-dest-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.destPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-view-dest]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dest = state.destinations.find((d) => d.id === btn.dataset.viewDest);
      if (dest) openDestinationDetailModal(dest);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-dest]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dest = state.destinations.find((d) => d.id === btn.dataset.editDest);
      if (dest) openDestinationModal(dest);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-dest]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const dest = state.destinations.find((d) => d.id === btn.dataset.delDest);
      if (!dest) return;
      const ok = await confirmDialog({
        title: 'Delete Destination',
        message: `Remove "${dest.name}" permanently? Linked tour packages should be reassigned first.`,
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deleteDestination(dest.id);
        if (lastAddedDestination?.id === dest.id) lastAddedDestination = null;
        showToast('Destination deleted.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete destination'), 'danger');
      }
    });
  });
}
