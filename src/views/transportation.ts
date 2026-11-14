import { Modal } from 'bootstrap';
import { ASSET_IMAGES } from '../seed';
import { deleteVehicle, getCurrency, navigateTo, saveVehicle, state } from '../store';
import type { RouteKey, Vehicle, VehicleCategory, VehicleStatus } from '../types';
import {
  compressImageFile,
  confirmDialog,
  escapeHtml,
  extractErrorMessage,
  formatCurrency,
  paginate,
  renderPaginationHtml,
  renderStatusLabel,
  showToast
} from '../utils/format';

let searchTerm = '';
let catFilter = 'all';
let currentPage = 1;

const VEHICLE_CATEGORIES: VehicleCategory[] = ['SUV', '4x4 Jeep', 'Tempo Traveller', 'Luxury Sedan'];

function openVehicleModal(vehicle?: Vehicle): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  const isEdit = Boolean(vehicle);
  let uploadedImage = vehicle?.imageUrl || '';

  contentEl.innerHTML = `
    <form id="vehicleForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">${isEdit ? 'Edit Fleet Vehicle' : 'Add Fleet Vehicle'}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Vehicle Model / Name *</label>
            <input type="text" class="form-control" name="name" required minlength="2" maxlength="120" value="${escapeHtml(vehicle?.name || '')}" placeholder="e.g. Toyota Fortuner 4x4" />
            <div class="invalid-feedback">Please enter the vehicle name (at least 2 characters).</div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Category *</label>
            <select class="form-select" name="category">
              ${VEHICLE_CATEGORIES.map((c) => `<option value="${c}" ${vehicle?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Status *</label>
            <select class="form-select" name="status">
              <option value="available" ${vehicle?.status === 'available' || !vehicle ? 'selected' : ''}>Available</option>
              <option value="on_trip" ${vehicle?.status === 'on_trip' ? 'selected' : ''}>On Trip</option>
              <option value="maintenance" ${vehicle?.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Registration No *</label>
            <input type="text" class="form-control" name="registrationNo" required minlength="3" maxlength="32" value="${escapeHtml(vehicle?.registrationNo || '')}" placeholder="HP-01A-4403" />
            <div class="invalid-feedback">Enter registration number (at least 3 characters).</div>
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label small fw-semibold">Seat Capacity *</label>
            <input type="number" class="form-control tabular-nums" name="seatCapacity" required min="1" max="80" value="${vehicle?.seatCapacity ?? 6}" />
            <div class="invalid-feedback">Enter 1 to 80 seats.</div>
          </div>
          <div class="col-6 col-md-4 d-flex align-items-end">
            <div class="form-check mb-2">
              <input class="form-check-input" type="checkbox" id="vehAcCheck" ${vehicle?.acAvailable !== false ? 'checked' : ''} />
              <label class="form-check-label small fw-semibold" for="vehAcCheck">Climate Control (AC)</label>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Rate / Day *</label>
            <input type="number" class="form-control tabular-nums" name="pricePerDay" required min="0" value="${vehicle?.pricePerDay ?? 4500}" />
            <div class="invalid-feedback">Enter daily rate.</div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Rate / Km</label>
            <input type="number" class="form-control tabular-nums" name="pricePerKm" min="0" value="${vehicle?.pricePerKm ?? 22}" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Driver Name</label>
            <input type="text" class="form-control" name="driverName" maxlength="120" value="${escapeHtml(vehicle?.driverName || '')}" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Driver Phone</label>
            <input type="text" class="form-control" name="driverPhone" maxlength="30" value="${escapeHtml(vehicle?.driverPhone || '')}" />
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Vehicle Image Upload</label>
            <input type="file" class="form-control" id="vehImageFile" accept="image/*" />
            <div class="d-flex flex-wrap gap-2 mt-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" data-veh-preset="${escapeHtml(ASSET_IMAGES.suv)}">Use Mountain SUV Preset</button>
            </div>
          </div>
          <div class="col-12" id="vehImagePreviewWrap" ${uploadedImage ? '' : 'style="display:none;"'}>
            <div class="d-inline-flex align-items-start gap-2">
              <img id="vehImagePreview" src="${escapeHtml(uploadedImage)}" alt="Vehicle preview" class="rounded border" style="max-height: 150px; object-fit: cover;" />
              <button type="button" class="btn btn-sm btn-outline-danger" id="clearVehImageBtn" title="Remove image">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer border-top">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-ltw" id="saveVehBtn">${isEdit ? 'Save Vehicle' : 'Add Vehicle'}</button>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  const fileInput = contentEl.querySelector('#vehImageFile') as HTMLInputElement;
  const previewImg = contentEl.querySelector('#vehImagePreview') as HTMLImageElement;
  const previewWrap = contentEl.querySelector('#vehImagePreviewWrap') as HTMLElement;
  const clearImgBtn = contentEl.querySelector('#clearVehImageBtn') as HTMLButtonElement | null;

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

  contentEl.querySelectorAll<HTMLElement>('[data-veh-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.vehPreset || '';
      if (url) setImage(url);
    });
  });

  clearImgBtn?.addEventListener('click', () => {
    setImage('');
    if (fileInput) fileInput.value = '';
  });

  const form = contentEl.querySelector('#vehicleForm') as HTMLFormElement;
  form.querySelectorAll<HTMLInputElement>('input[minlength]').forEach((el) => {
    el.addEventListener('input', () => el.setCustomValidity(''));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = form.elements.namedItem('name') as HTMLInputElement | null;
    const regEl = form.elements.namedItem('registrationNo') as HTMLInputElement | null;
    if (nameEl) nameEl.setCustomValidity(nameEl.value.trim().length < 2 ? 'Must be at least 2 characters.' : '');
    if (regEl) regEl.setCustomValidity(regEl.value.trim().length < 3 ? 'Must be at least 3 characters.' : '');

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please complete all required vehicle fields.', 'warning');
      return;
    }
    const fd = new FormData(form);
    const btn = contentEl.querySelector('#saveVehBtn') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await saveVehicle({
        id: vehicle?.id,
        name: String(fd.get('name')).trim(),
        category: String(fd.get('category')) as VehicleCategory,
        registrationNo: String(fd.get('registrationNo')).trim(),
        seatCapacity: Number(fd.get('seatCapacity')),
        pricePerDay: Number(fd.get('pricePerDay')),
        pricePerKm: Number(fd.get('pricePerKm') || 0),
        driverName: String(fd.get('driverName') || '').trim(),
        driverPhone: String(fd.get('driverPhone') || '').trim(),
        acAvailable: form.querySelector<HTMLInputElement>('#vehAcCheck')?.checked ?? true,
        imageUrl: uploadedImage,
        status: String(fd.get('status')) as VehicleStatus
      });
      modal.hide();
      showToast(isEdit ? 'Vehicle updated.' : 'Vehicle added to fleet.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to save vehicle'), 'danger');
      btn.disabled = false;
    }
  });
}

export function renderTransportView(route: RouteKey): string {
  const currency = getCurrency();

  if (route === 'transport-categories') {
    return `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 class="mb-1 fw-bold">Vehicle Categories & Seat Capacity</h4>
          <p class="text-muted small mb-0">Fleet breakdown by vehicle class and total passenger seating capacity.</p>
        </div>
        <button type="button" class="btn btn-sm btn-ltw" id="addVehicleBtn"><i class="bi bi-plus-lg me-1"></i>Add Vehicle</button>
      </div>
      <div class="row g-3">
        ${VEHICLE_CATEGORIES.map((cat) => {
          const items = state.vehicles.filter((v) => v.category === cat);
          const totalSeats = items.reduce((acc, v) => acc + v.seatCapacity, 0);
          return `
            <div class="col-sm-6 col-xl-3">
              <div class="ltw-card p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="fw-bold fs-6 mb-1">${cat}</div>
                  <div class="small text-muted mb-3">${items.length} vehicles in fleet</div>
                </div>
                <div class="border-top pt-3 d-flex align-items-center justify-content-between gap-2 small tabular-nums">
                  <span><span class="text-muted">Capacity:</span> <strong>${totalSeats} Seats</strong></span>
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-filter-veh-cat="${escapeHtml(cat)}">View</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (route === 'transport-pricing') {
    return `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 class="mb-1 fw-bold">Transportation Pricing</h4>
          <p class="text-muted small mb-0">Daily charter and per-kilometer rates for mountain transfers and expeditions.</p>
        </div>
        <button type="button" class="btn btn-sm btn-ltw" id="addVehicleBtn"><i class="bi bi-plus-lg me-1"></i>Add Vehicle</button>
      </div>
      <div class="ltw-card overflow-hidden">
        <div class="table-responsive">
          <table class="table ltw-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Seats</th>
                <th class="text-end">Rate / Day</th>
                <th class="text-end">Rate / Km</th>
                <th>Status</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              ${state.vehicles
                .map(
                  (v) => `
                <tr>
                  <td class="fw-semibold">${escapeHtml(v.name)}</td>
                  <td>${escapeHtml(v.category)}</td>
                  <td class="tabular-nums">${v.seatCapacity} Pax</td>
                  <td class="text-end tabular-nums fw-semibold">${formatCurrency(v.pricePerDay, currency)}</td>
                  <td class="text-end tabular-nums">${formatCurrency(v.pricePerKm || 0, currency)}/km</td>
                  <td>${renderStatusLabel(v.status)}</td>
                  <td class="text-end">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-veh="${escapeHtml(v.id)}">Update Rates</button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  const filtered = state.vehicles.filter((v) => {
    if (catFilter !== 'all' && v.category !== catFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.registrationNo.toLowerCase().includes(q) ||
        (v.driverName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paged = paginate(filtered, currentPage, 8);
  currentPage = paged.currentPage;

  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="mb-1 fw-bold">Manage Mountain Fleet Vehicles</h4>
        <p class="text-muted small mb-0">Assign certified mountain drivers, manage seat capacities, and monitor availability.</p>
      </div>
      <button type="button" class="btn btn-sm btn-ltw" id="addVehicleBtn">
        <i class="bi bi-plus-lg me-1"></i>Add Vehicle
      </button>
    </div>

    <div class="ltw-card p-3 mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-6">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="search" class="form-control" id="vehSearchInput" placeholder="Search model, registration no, or driver..." value="${escapeHtml(searchTerm)}" />
          </div>
        </div>
        <div class="col-md-4">
          <select class="form-select form-select-sm" id="vehCatFilter">
            <option value="all" ${catFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${VEHICLE_CATEGORIES.map((c) => `<option value="${c}" ${catFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-2 text-md-end small text-muted tabular-nums">${filtered.length} vehicles</div>
      </div>
    </div>

    <div class="ltw-card overflow-hidden">
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Category</th>
              <th>Seats</th>
              <th>Driver</th>
              <th class="text-end">Daily Rate</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              paged.slice.length === 0
                ? `<tr><td colspan="7" class="text-center py-5 text-muted">No vehicles found.</td></tr>`
                : paged.slice
                    .map(
                      (v) => `
                  <tr>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        ${
                          v.imageUrl
                            ? `<img src="${escapeHtml(v.imageUrl)}" alt="${escapeHtml(v.name)}" class="ltw-thumb" referrerpolicy="no-referrer" />`
                            : `<div class="ltw-thumb d-flex align-items-center justify-content-center text-muted"><i class="bi bi-truck"></i></div>`
                        }
                        <div>
                          <div class="fw-semibold">${escapeHtml(v.name)}</div>
                          <div class="small font-mono-num text-muted">${escapeHtml(v.registrationNo)} · ${v.acAvailable ? 'AC' : 'Non-AC'}</div>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(v.category)}</td>
                    <td class="tabular-nums">${v.seatCapacity} Seats</td>
                    <td class="small">
                      <div>${escapeHtml(v.driverName || 'Unassigned')}</div>
                      <div class="text-muted">${escapeHtml(v.driverPhone || '')}</div>
                    </td>
                    <td class="text-end tabular-nums fw-semibold">${formatCurrency(v.pricePerDay, currency)}</td>
                    <td>${renderStatusLabel(v.status)}</td>
                    <td class="text-end text-nowrap">
                      <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-veh="${escapeHtml(v.id)}" title="Edit"><i class="bi bi-pencil"></i></button>
                      <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-veh="${escapeHtml(v.id)}" title="Delete"><i class="bi bi-trash"></i></button>
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
              ${renderPaginationHtml(paged.currentPage, paged.totalPages, 'data-veh-page')}
            </div>`
          : ''
      }
    </div>
  `;
}

export function bindTransportEvents(root: HTMLElement): void {
  root.querySelector('#addVehicleBtn')?.addEventListener('click', () => openVehicleModal());

  root.querySelectorAll<HTMLElement>('[data-filter-veh-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      catFilter = btn.dataset.filterVehCat || 'all';
      currentPage = 1;
      navigateTo('transport-vehicles');
    });
  });

  root.querySelector('#vehSearchInput')?.addEventListener('input', (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelector('#vehCatFilter')?.addEventListener('change', (e) => {
    catFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    import('../store').then((m) => m.emit());
  });

  root.querySelectorAll<HTMLElement>('[data-veh-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.vehPage) || 1;
      import('../store').then((m) => m.emit());
    });
  });

  root.querySelectorAll<HTMLElement>('[data-edit-veh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const veh = state.vehicles.find((v) => v.id === btn.dataset.editVeh);
      if (veh) openVehicleModal(veh);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-veh]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const veh = state.vehicles.find((v) => v.id === btn.dataset.delVeh);
      if (!veh) return;
      const ok = await confirmDialog({
        title: 'Delete Vehicle',
        message: `Remove "${veh.name}" (${veh.registrationNo}) from fleet?`,
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      try {
        await deleteVehicle(veh.id);
        showToast('Vehicle removed.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to delete vehicle'), 'danger');
      }
    });
  });
}
