import { Modal } from 'bootstrap';
import { ASSET_IMAGES } from '../seed';
import { deletePackage, getCurrency, navigateTo, savePackage, state } from '../store';
import type { DifficultyLevel, PackageCategory, PublishLifecycle, RouteKey, TourPackage } from '../types';
import {
  compressImageFile,
  confirmDialog,
  escapeHtml,
  extractErrorMessage,
  formatCurrency,
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
let lastAddedPackage: { id: string; title: string } | null = null;

const PKG_CATEGORIES: PackageCategory[] = [
  'Hill Retreat',
  'Adventure Sports',
  'Riverside Escape',
  'Snow Expedition',
  'Family Holiday',
  'Backpacking'
];

interface PackageDraft {
  title: string;
  status: PublishLifecycle;
  destinationId: string;
  category: PackageCategory;
  durationDays: number;
  durationNights: number;
  pricePerPerson: number;
  discountPercent: number;
  maxGroupSize: number;
  difficulty: DifficultyLevel;
  featured: boolean;
  inclusionsText: string;
  itineraryText: string;
  imageUrl: string;
}

function createEmptyPackageDraft(): PackageDraft {
  return {
    title: '',
    status: 'active',
    destinationId: state.destinations[0]?.id || '',
    category: 'Hill Retreat',
    durationDays: 4,
    durationNights: 3,
    pricePerPerson: 12999,
    discountPercent: 0,
    maxGroupSize: 12,
    difficulty: 'Easy',
    featured: false,
    inclusionsText: '',
    itineraryText: '',
    imageUrl: ''
  };
}

let addPkgDraft: PackageDraft = createEmptyPackageDraft();

function renderPackageFormFields(values: PackageDraft): string {
  const destId = values.destinationId || state.destinations[0]?.id || '';
  return `
    <div class="row g-3">
      <div class="col-12 col-md-8">
        <label class="form-label small fw-semibold" for="pkgTitleInput">Package Title *</label>
        <input
          type="text"
          class="form-control"
          id="pkgTitleInput"
          name="title"
          required
          minlength="3"
          maxlength="150"
          value="${escapeHtml(values.title)}"
          placeholder="e.g. Manali Mountain Adventure & Solang Fly"
        />
        <div class="invalid-feedback">Please enter a package title (at least 3 characters).</div>
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label small fw-semibold" for="pkgStatusSelect">Status *</label>
        <select class="form-select" id="pkgStatusSelect" name="status" required>
          <option value="active" ${values.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="draft" ${values.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="archived" ${values.status === 'archived' ? 'selected' : ''}>Archived</option>
        </select>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="pkgDestSelect">Destination *</label>
        <select class="form-select" id="pkgDestSelect" name="destinationId" required>
          ${state.destinations
            .map((d) => `<option value="${escapeHtml(d.id)}" ${destId === d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`)
            .join('')}
        </select>
        <div class="invalid-feedback">Please select a destination.</div>
      </div>
      <div class="col-12 col-sm-6">
        <label class="form-label small fw-semibold" for="pkgCatSelect">Category *</label>
        <select class="form-select" id="pkgCatSelect" name="category" required>
          ${PKG_CATEGORIES.map((c) => `<option value="${c}" ${values.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>

      <div class="col-6 col-md-3">
        <label class="form-label small fw-semibold" for="pkgDaysInput">Days *</label>
        <input
          type="number"
          inputmode="numeric"
          class="form-control tabular-nums"
          id="pkgDaysInput"
          name="durationDays"
          required
          min="1"
          max="60"
          value="${values.durationDays}"
        />
        <div class="invalid-feedback">Enter 1 to 60 days.</div>
      </div>
      <div class="col-6 col-md-3">
        <label class="form-label small fw-semibold" for="pkgNightsInput">Nights *</label>
        <input
          type="number"
          inputmode="numeric"
          class="form-control tabular-nums"
          id="pkgNightsInput"
          name="durationNights"
          required
          min="0"
          max="60"
          value="${values.durationNights}"
        />
        <div class="invalid-feedback">Enter 0 to 60 nights.</div>
      </div>
      <div class="col-6 col-md-3">
        <label class="form-label small fw-semibold" for="pkgPriceInput">Price / Person *</label>
        <input
          type="number"
          inputmode="numeric"
          class="form-control tabular-nums"
          id="pkgPriceInput"
          name="pricePerPerson"
          required
          min="0"
          max="10000000"
          value="${values.pricePerPerson}"
        />
        <div class="invalid-feedback">Enter a valid price.</div>
      </div>
      <div class="col-6 col-md-3">
        <label class="form-label small fw-semibold" for="pkgDiscountInput">Discount (%)</label>
        <input
          type="number"
          inputmode="numeric"
          class="form-control tabular-nums"
          id="pkgDiscountInput"
          name="discountPercent"
          min="0"
          max="95"
          value="${values.discountPercent}"
        />
        <div class="invalid-feedback">Enter 0 to 95%.</div>
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold" for="pkgGroupSizeInput">Max Group Size *</label>
        <input
          type="number"
          inputmode="numeric"
          class="form-control tabular-nums"
          id="pkgGroupSizeInput"
          name="maxGroupSize"
          required
          min="1"
          max="200"
          value="${values.maxGroupSize}"
        />
        <div class="invalid-feedback">Enter 1 to 200 travelers.</div>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold" for="pkgDifficultySelect">Difficulty *</label>
        <select class="form-select" id="pkgDifficultySelect" name="difficulty" required>
          <option value="Easy" ${values.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
          <option value="Moderate" ${values.difficulty === 'Moderate' ? 'selected' : ''}>Moderate</option>
          <option value="Challenging" ${values.difficulty === 'Challenging' ? 'selected' : ''}>Challenging</option>
        </select>
      </div>
      <div class="col-12 col-md-4 d-flex align-items-md-end">
        <div class="form-check mt-1 mt-md-0 mb-md-2">
          <input class="form-check-input" type="checkbox" id="pkgFeaturedCheck" ${values.featured ? 'checked' : ''} />
          <label class="form-check-label small fw-semibold" for="pkgFeaturedCheck">Featured Package</label>
        </div>
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label small fw-semibold" for="pkgInclusionsInput">Inclusions (one per line)</label>
        <textarea
          class="form-control small"
          id="pkgInclusionsInput"
          name="inclusions"
          rows="4"
          placeholder="Boutique hotel stay&#10;Daily breakfast & dinner&#10;Private mountain SUV"
        >${escapeHtml(values.inclusionsText)}</textarea>
      </div>
      <div class="col-12 col-md-6">
        <label class="form-label small fw-semibold" for="pkgItineraryInput">Day-by-Day Itinerary (one day per line)</label>
        <textarea
          class="form-control small"
          id="pkgItineraryInput"
          name="itinerary"
          rows="4"
          placeholder="Day 1: Arrival & Mall Road walk&#10;Day 2: Kufri & Mashobra tour"
        >${escapeHtml(values.itineraryText)}</textarea>
      </div>

      <div class="col-12">
        <label class="form-label small fw-semibold" for="pkgImageFile">Cover Image Upload</label>
        <input type="file" class="form-control" id="pkgImageFile" accept="image/*" />
        <div class="form-text">Automatically resized and optimized for cloud storage, or pick a quick preset below.</div>
        <div class="d-flex flex-wrap gap-2 mt-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" data-pkg-preset="${escapeHtml(ASSET_IMAGES.dharamshala)}">Dharamshala</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-pkg-preset="${escapeHtml(ASSET_IMAGES.shimla)}">Shimla</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-pkg-preset="${escapeHtml(ASSET_IMAGES.manali)}">Manali</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-pkg-preset="${escapeHtml(ASSET_IMAGES.kasol)}">Kasol</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-pkg-preset="${escapeHtml(ASSET_IMAGES.spiti)}">Spiti</button>
        </div>
      </div>
      <div class="col-12" id="pkgImagePreviewWrap" ${values.imageUrl ? '' : 'style="display:none;"'}>
        <div class="d-inline-flex align-items-start gap-2 max-w-100">
          <img id="pkgImagePreview" src="${escapeHtml(values.imageUrl)}" alt="Package preview" class="img-fluid rounded border" style="max-height: 170px; object-fit: cover;" />
          <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" id="clearPkgImageBtn" title="Remove image">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindPackageForm(
  container: HTMLElement,
  pkg: TourPackage | undefined,
  options: {
    initialImage: string;
    syncDraft?: boolean;
    onSuccess: () => void;
  }
): void {
  const isEdit = Boolean(pkg);
  let uploadedImage = options.initialImage;

  const form = container.querySelector('#packageForm') as HTMLFormElement | null;
  if (!form) return;

  const fileInput = container.querySelector('#pkgImageFile') as HTMLInputElement | null;
  const previewImg = container.querySelector('#pkgImagePreview') as HTMLImageElement | null;
  const previewWrap = container.querySelector('#pkgImagePreviewWrap') as HTMLElement | null;
  const clearImgBtn = container.querySelector('#clearPkgImageBtn') as HTMLButtonElement | null;

  const setImage = (url: string) => {
    uploadedImage = url;
    if (options.syncDraft) addPkgDraft.imageUrl = url;
    if (previewImg && previewWrap) {
      previewImg.src = url;
      previewWrap.style.display = url ? 'block' : 'none';
    }
  };

  if (options.syncDraft) {
    const syncFields = () => {
      const fd = new FormData(form);
      addPkgDraft = {
        title: String(fd.get('title') || ''),
        status: String(fd.get('status') || 'active') as PublishLifecycle,
        destinationId: String(fd.get('destinationId') || state.destinations[0]?.id || ''),
        category: String(fd.get('category') || 'Hill Retreat') as PackageCategory,
        durationDays: Number(fd.get('durationDays') || 4),
        durationNights: Number(fd.get('durationNights') || 3),
        pricePerPerson: Number(fd.get('pricePerPerson') || 0),
        discountPercent: Number(fd.get('discountPercent') || 0),
        maxGroupSize: Number(fd.get('maxGroupSize') || 12),
        difficulty: String(fd.get('difficulty') || 'Easy') as DifficultyLevel,
        featured: form.querySelector<HTMLInputElement>('#pkgFeaturedCheck')?.checked ?? false,
        inclusionsText: String(fd.get('inclusions') || ''),
        itineraryText: String(fd.get('itinerary') || ''),
        imageUrl: uploadedImage
      };
    };
    form.addEventListener('input', syncFields);
    form.addEventListener('change', syncFields);
  }

  form.querySelectorAll<HTMLInputElement>('input[minlength]').forEach((el) => {
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

  container.querySelectorAll<HTMLElement>('[data-pkg-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.pkgPreset || '';
      if (url) setImage(url);
    });
  });

  clearImgBtn?.addEventListener('click', () => {
    setImage('');
    if (fileInput) fileInput.value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleEl = form.elements.namedItem('title') as HTMLInputElement | null;
    if (titleEl) {
      titleEl.setCustomValidity(titleEl.value.trim().length < 3 ? 'Must be at least 3 characters.' : '');
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
    const btn = container.querySelector('#savePkgBtn') as HTMLButtonElement | null;
    const originalHtml = btn?.innerHTML || '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>${isEdit ? 'Saving...' : 'Creating...'}`;
    }

    try {
      const title = String(fd.get('title') || '').trim();
      const inclusions = String(fd.get('inclusions') || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const itinerary = String(fd.get('itinerary') || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const savedId = await savePackage({
        id: pkg?.id,
        title,
        slug: pkg?.slug || slugify(title),
        destinationId: String(fd.get('destinationId')),
        category: String(fd.get('category')) as PackageCategory,
        durationDays: Number(fd.get('durationDays')),
        durationNights: Number(fd.get('durationNights')),
        pricePerPerson: Number(fd.get('pricePerPerson')),
        discountPercent: Number(fd.get('discountPercent') || 0),
        maxGroupSize: Number(fd.get('maxGroupSize')),
        difficulty: String(fd.get('difficulty')) as DifficultyLevel,
        inclusions,
        itinerary,
        imageUrl: uploadedImage,
        galleryImages: pkg?.galleryImages || (uploadedImage ? [uploadedImage] : []),
        featured: form.querySelector<HTMLInputElement>('#pkgFeaturedCheck')?.checked ?? false,
        status: String(fd.get('status')) as PublishLifecycle
      });

      if (!isEdit) {
        searchTerm = '';
        categoryFilter = 'all';
        currentPage = 1;
        addPkgDraft = createEmptyPackageDraft();
        lastAddedPackage = { id: savedId, title };
      }
      options.onSuccess();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(isEdit ? 'Tour package updated.' : `Tour package "${title}" created.`);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to save package.'), 'danger');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  });
}

export function openPackageModal(pkg?: TourPackage): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  if (state.destinations.length === 0) {
    showToast('Please create at least one destination before adding a tour package.', 'warning');
    navigateTo('destinations-manage');
    return;
  }

  const isEdit = Boolean(pkg);
  const draft: PackageDraft = pkg
    ? {
        title: pkg.title || '',
        status: pkg.status || 'active',
        destinationId: pkg.destinationId || state.destinations[0]?.id || '',
        category: pkg.category || 'Hill Retreat',
        durationDays: pkg.durationDays ?? 4,
        durationNights: pkg.durationNights ?? 3,
        pricePerPerson: pkg.pricePerPerson ?? 12999,
        discountPercent: pkg.discountPercent ?? 0,
        maxGroupSize: pkg.maxGroupSize ?? 12,
        difficulty: pkg.difficulty || 'Easy',
        featured: Boolean(pkg.featured),
        inclusionsText: (pkg.inclusions || []).join('\n'),
        itineraryText: (pkg.itinerary || []).join('\n'),
        imageUrl: pkg.imageUrl || ''
      }
    : createEmptyPackageDraft();

  contentEl.innerHTML = `
    <form id="packageForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? 'Edit Tour Package' : 'Add Tour Package'}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        ${renderPackageFormFields(draft)}
      </div>
      <div class="modal-footer border-top">
        <div class="ltw-modal-actions d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-ltw" id="savePkgBtn">${isEdit ? 'Save Package' : 'Create Package'}</button>
        </div>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  bindPackageForm(contentEl, pkg, {
    initialImage: draft.imageUrl,
    onSuccess: () => {
      modal.hide();
      if (state.activeRoute !== 'packages-manage') {
        navigateTo('packages-manage');
      }
    }
  });
}

export function renderPackagesView(route: RouteKey): string {
  const currency = getCurrency();

  if (route === 'packages-add') {
    if (state.destinations.length === 0) {
      return `
        <div class="ltw-card p-3 p-sm-4">
          <h5 class="fw-bold mb-2">No Destinations Available</h5>
          <p class="text-muted small mb-3">Please add at least one destination before creating a tour package.</p>
          <button type="button" class="btn btn-sm btn-ltw ltw-mobile-full" id="goToAddDestBtn">Add Destination</button>
        </div>
      `;
    }
    if (!addPkgDraft.destinationId && state.destinations[0]) {
      addPkgDraft.destinationId = state.destinations[0].id;
    }
    const recentPackages = state.packages.slice(0, 8);
    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Add Tour Package</h4>
          <p class="text-muted small mb-0">Configure duration, pricing, itinerary, and cover media for a new tour package.</p>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary ltw-mobile-full" id="backToManagePkgBtn">
          <i class="bi bi-list-ul me-1"></i>Manage Packages (${state.packages.length})
        </button>
      </div>

      <div class="ltw-card p-3 p-sm-4 mb-4">
        <form id="packageForm" novalidate>
          ${renderPackageFormFields(addPkgDraft)}
          <div class="d-grid d-sm-flex justify-content-sm-end gap-2 border-top pt-3 mt-4">
            <button type="button" class="btn btn-outline-secondary" id="resetAddPkgBtn">Reset Form</button>
            <button type="submit" class="btn btn-ltw" id="savePkgBtn">
              <i class="bi bi-check2-circle me-1"></i>Create Package
            </button>
          </div>
        </form>
      </div>

      <div class="ltw-card overflow-hidden">
        <div class="p-3 p-sm-4 border-bottom d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
          <div>
            <h6 class="fw-semibold mb-0">Recently Saved Tour Packages (${state.packages.length} Total)</h6>
            <div class="small text-muted">New packages are validated on the backend and synced directly to Cloud Firestore.</div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary ltw-mobile-full" id="viewAllFromAddPkgBtn">View All</button>
        </div>

        <div class="d-md-none">
          ${
            recentPackages.length === 0
              ? `<div class="p-4 text-center text-muted small">No tour packages saved yet.</div>`
              : `<div>
                  ${recentPackages
                    .map(
                      (p) => `
                    <div class="p-3 border-bottom">
                      <div class="d-flex align-items-start justify-content-between gap-2 mb-1">
                        <div class="fw-semibold">${escapeHtml(p.title)}</div>
                        ${renderStatusLabel(p.status)}
                      </div>
                      <div class="small text-muted">${escapeHtml(p.destinationName)} · ${p.durationDays}D/${p.durationNights}N · ${formatCurrency(p.pricePerPerson, currency)}</div>
                      <div class="small text-muted mt-1">Created: ${formatDate(p.createdAt)}</div>
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
                <th>Package</th>
                <th>Destination</th>
                <th>Duration</th>
                <th class="text-end">Price</th>
                <th>Status</th>
                <th class="text-end">Created</th>
              </tr>
            </thead>
            <tbody>
              ${
                recentPackages.length === 0
                  ? `<tr><td colspan="6" class="text-center py-4 text-muted">No tour packages saved yet.</td></tr>`
                  : recentPackages
                      .map(
                        (p) => `
                    <tr>
                      <td class="fw-semibold">${escapeHtml(p.title)}</td>
                      <td>${escapeHtml(p.destinationName)}</td>
                      <td class="tabular-nums">${p.durationDays}D / ${p.durationNights}N</td>
                      <td class="text-end tabular-nums fw-semibold">${formatCurrency(p.pricePerPerson, currency)}</td>
                      <td>${renderStatusLabel(p.status)}</td>
                      <td class="text-end small text-muted">${formatDate(p.createdAt)}</td>
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

  if (route === 'packages-pricing') {
    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Package Pricing Matrix</h4>
          <p class="text-muted small mb-0">Inspect base per-person rates, seasonal discounts, and net payable rates.</p>
        </div>
        <button type="button" class="btn btn-sm btn-ltw ltw-mobile-full" id="addPkgBtn"><i class="bi bi-plus-lg me-1"></i>Add Package</button>
      </div>
      <div class="ltw-card overflow-hidden">
        <div class="table-responsive">
          <table class="table ltw-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Destination</th>
                <th>Duration</th>
                <th class="text-end">Base Price</th>
                <th class="text-end">Discount</th>
                <th class="text-end">Net Rate / Person</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.packages
                .map((p) => {
                  const disc = Number(p.discountPercent || 0);
                  const net = Math.round(p.pricePerPerson * (1 - disc / 100));
                  return `
                    <tr>
                      <td class="fw-semibold">${escapeHtml(p.title)}</td>
                      <td>${escapeHtml(p.destinationName)}</td>
                      <td class="tabular-nums">${p.durationDays}D / ${p.durationNights}N</td>
                      <td class="text-end tabular-nums">${formatCurrency(p.pricePerPerson, currency)}</td>
                      <td class="text-end tabular-nums">${disc}%</td>
                      <td class="text-end tabular-nums fw-bold">${formatCurrency(net, currency)}</td>
                      <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-pkg="${escapeHtml(p.id)}">Adjust Pricing</button>
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (route === 'packages-itineraries') {
    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Tour Itineraries</h4>
          <p class="text-muted small mb-0">Day-by-day route schedules and inclusions across all active packages.</p>
        </div>
        <button type="button" class="btn btn-sm btn-ltw ltw-mobile-full" id="addPkgBtn"><i class="bi bi-plus-lg me-1"></i>New Tour Package</button>
      </div>
      <div class="row g-3">
        ${state.packages
          .map(
            (p) => `
          <div class="col-12 col-lg-6">
            <div class="ltw-card p-3 p-sm-4 h-100">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div class="min-w-0">
                  <div class="small text-muted">${escapeHtml(p.destinationName)} · ${p.durationDays} Days / ${p.durationNights} Nights</div>
                  <h6 class="fw-bold mb-0">${escapeHtml(p.title)}</h6>
                </div>
                <button type="button" class="btn btn-sm btn-outline-secondary flex-shrink-0" data-edit-pkg="${escapeHtml(p.id)}"><i class="bi bi-pencil me-1"></i>Edit</button>
              </div>
              <ol class="small ps-3 mb-0 mt-3 text-secondary">
                ${(p.itinerary || []).map((day) => `<li class="mb-1">${escapeHtml(day)}</li>`).join('') || '<li class="text-muted">No itinerary lines added yet.</li>'}
              </ol>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  if (route === 'packages-images') {
    return `
      <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
        <div>
          <h4 class="mb-1 fw-bold">Package Media & Cover Images</h4>
          <p class="text-muted small mb-0">Preview and replace tour package cover photography.</p>
        </div>
      </div>
      <div class="row g-3">
        ${state.packages
          .map(
            (p) => `
          <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div class="ltw-card overflow-hidden h-100 d-flex flex-column">
              ${
                p.imageUrl
                  ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" class="ltw-media-card-img" referrerpolicy="no-referrer" />`
                  : `<div class="ltw-media-card-img d-flex align-items-center justify-content-center text-muted"><i class="bi bi-image fs-1"></i></div>`
              }
              <div class="p-3 d-flex flex-column justify-content-between flex-grow-1">
                <div>
                  <div class="small text-muted">${escapeHtml(p.destinationName)}</div>
                  <div class="fw-semibold small mb-2">${escapeHtml(p.title)}</div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-secondary w-100" data-edit-pkg="${escapeHtml(p.id)}">
                  <i class="bi bi-upload me-1"></i>Update Image
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  const filtered = state.packages.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.destinationName.toLowerCase().includes(q);
    }
    return true;
  });

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  return `
    <div class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 gap-sm-3 mb-3 mb-md-4">
      <div>
        <h4 class="mb-1 fw-bold">Manage Tour Packages</h4>
        <p class="text-muted small mb-0">Control itineraries, pricing, group limits, and active tour packages.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary flex-fill flex-sm-grow-0" id="goAddPkgPageBtn">
          <i class="bi bi-file-earmark-plus me-1"></i>Full Form
        </button>
        <button type="button" class="btn btn-sm btn-ltw flex-fill flex-sm-grow-0" id="addPkgBtn">
          <i class="bi bi-plus-lg me-1"></i>Add Tour Package
        </button>
      </div>
    </div>

    ${
      lastAddedPackage
        ? `<div class="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between gap-2 mb-3" role="alert">
            <div class="small">
              <i class="bi bi-check-circle-fill me-2"></i>
              <strong>${escapeHtml(lastAddedPackage.title)}</strong> was saved to Firestore and appears at the top of your packages list.
            </div>
            <button type="button" class="btn-close" id="dismissAddedPkgAlert" aria-label="Close"></button>
          </div>`
        : ''
    }

    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-12 col-sm-6">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="pkgSearchInput" placeholder="Search packages or destinations..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-8 col-sm-4">
          <select class="form-select form-select-sm" id="pkgCatFilter">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${PKG_CATEGORIES.map((c) => `<option value="${c}" ${categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="col-4 col-sm-2 text-end small text-muted tabular-nums">${filtered.length} total</div>
      </div>
    </div>

    <div class="ltw-card overflow-hidden">
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Destination</th>
              <th>Category</th>
              <th>Duration</th>
              <th class="text-end">Price</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              paged.slice.length === 0
                ? `<tr><td colspan="7" class="text-center py-5 text-muted">No tour packages match your filter.</td></tr>`
                : paged.slice
                    .map((p) => {
                      const isJustAdded = lastAddedPackage?.id === p.id;
                      return `
                  <tr class="${isJustAdded ? 'table-success' : ''}">
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        ${
                          p.imageUrl
                            ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" class="ltw-thumb" referrerpolicy="no-referrer" />`
                            : `<div class="ltw-thumb d-flex align-items-center justify-content-center text-muted"><i class="bi bi-compass"></i></div>`
                        }
                        <div>
                          <div class="fw-semibold">${escapeHtml(p.title)}</div>
                          <div class="small text-muted">Max ${p.maxGroupSize} pax · ${escapeHtml(p.difficulty)}</div>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(p.destinationName)}</td>
                    <td>${escapeHtml(p.category)}</td>
                    <td class="tabular-nums">${p.durationDays}D / ${p.durationNights}N</td>
                    <td class="text-end tabular-nums fw-semibold">${formatCurrency(p.pricePerPerson, currency)}</td>
                    <td>${renderStatusLabel(p.status)}</td>
                    <td class="text-end text-nowrap">
                      <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-pkg="${escapeHtml(p.id)}" title="Edit">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-pkg="${escapeHtml(p.id)}" title="Delete">
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
              ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-pkg-page')}
            </div>`
          : ''
      }
    </div>
  `;
}

export function bindPackagesEvents(root: HTMLElement, route: RouteKey): void {
  if (route === 'packages-add') {
    root.querySelector('#goToAddDestBtn')?.addEventListener('click', () => navigateTo('destinations-add'));
    root.querySelector('#backToManagePkgBtn')?.addEventListener('click', () => navigateTo('packages-manage'));
    root.querySelector('#viewAllFromAddPkgBtn')?.addEventListener('click', () => navigateTo('packages-manage'));
    root.querySelector('#resetAddPkgBtn')?.addEventListener('click', () => {
      addPkgDraft = createEmptyPackageDraft();
      import('../store').then((m) => m.emit());
    });
    bindPackageForm(root, undefined, {
      initialImage: addPkgDraft.imageUrl,
      syncDraft: true,
      onSuccess: () => {
        navigateTo('packages-manage');
      }
    });
    return;
  }

  root.querySelector('#dismissAddedPkgAlert')?.addEventListener('click', () => {
    lastAddedPackage = null;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#goAddPkgPageBtn')?.addEventListener('click', () => navigateTo('packages-add'));
  root.querySelector('#addPkgBtn')?.addEventListener('click', () => openPackageModal());

  root.querySelector('#pkgSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#pkgCatFilter')?.addEventListener('change', (e) => {
    categoryFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-pkg-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.pkgPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-pkg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pkg = state.packages.find((p) => p.id === btn.dataset.editPkg);
      if (pkg) openPackageModal(pkg);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-pkg]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pkg = state.packages.find((p) => p.id === btn.dataset.delPkg);
      if (!pkg) return;
      const ok = await confirmDialog({
        title: 'Delete Tour Package',
        message: `Delete "${pkg.title}"? Existing bookings will retain their historical snapshot.`,
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deletePackage(pkg.id);
        if (lastAddedPackage?.id === pkg.id) lastAddedPackage = null;
        showToast('Tour package deleted.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete package'), 'danger');
      }
    });
  });
}
