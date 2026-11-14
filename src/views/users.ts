import { Modal } from 'bootstrap';
import {
  createAdminInvite,
  deleteAdminInvite,
  deleteAdminUser,
  state,
  updateAdminProfile
} from '../store';
import type { AdminRole, AdminStatus, AdminUser, RouteKey } from '../types';
import { confirmDialog, escapeHtml, extractErrorMessage, formatDate, renderStatusLabel, showToast } from '../utils/format';

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  operations_manager: 'Operations Manager',
  content_editor: 'Content Editor',
  support_agent: 'Support Agent'
};

function openInviteModal(): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  contentEl.innerHTML = `
    <form id="inviteForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">Invite Administrator</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p class="small text-muted">When the invited user signs in with their Google account, their assigned role will automatically activate.</p>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label small fw-semibold">Full Name *</label>
            <input type="text" class="form-control" name="displayName" required minlength="2" maxlength="120" />
            <div class="invalid-feedback">Please enter full name (at least 2 characters).</div>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Google Email Address *</label>
            <input type="email" class="form-control" name="email" required maxlength="160" placeholder="teammate@gmail.com" />
            <div class="invalid-feedback">Please enter a valid Google email address.</div>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Assigned Role *</label>
            <select class="form-select" name="role">
              <option value="operations_manager">Operations Manager (Bookings, Fleet, Packages)</option>
              <option value="content_editor">Content Editor (Destinations, CMS, SEO)</option>
              <option value="support_agent">Support Agent (Enquiries, Customers, Bookings)</option>
              <option value="super_admin">Super Admin (Full System Access)</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer border-top">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-ltw" id="sendInviteBtn">Create Admin Invite</button>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  const form = contentEl.querySelector('#inviteForm') as HTMLFormElement;
  form.querySelectorAll<HTMLInputElement>('input[minlength]').forEach((el) => {
    el.addEventListener('input', () => el.setCustomValidity(''));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = form.elements.namedItem('displayName') as HTMLInputElement | null;
    if (nameEl) nameEl.setCustomValidity(nameEl.value.trim().length < 2 ? 'Must be at least 2 characters.' : '');

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
      showToast('Please enter a valid name and email.', 'warning');
      return;
    }
    const fd = new FormData(form);
    const btn = contentEl.querySelector('#sendInviteBtn') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await createAdminInvite(
        String(fd.get('email')).trim(),
        String(fd.get('displayName')).trim(),
        String(fd.get('role')) as AdminRole
      );
      modal.hide();
      showToast('Admin invite created.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Only Super Admins can invite users.'), 'danger');
      btn.disabled = false;
    }
  });
}

function openEditAdminModal(admin: AdminUser): void {
  const modalEl = document.getElementById('workspaceModal');
  const contentEl = document.getElementById('workspaceModalContent');
  if (!modalEl || !contentEl) return;

  contentEl.innerHTML = `
    <form id="editAdminForm" novalidate>
      <div class="modal-header border-bottom">
        <h5 class="modal-title fw-bold">Edit Admin Role & Status</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <div class="fw-semibold">${escapeHtml(admin.displayName)}</div>
          <div class="small text-muted">${escapeHtml(admin.email)}</div>
        </div>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Role</label>
            <select class="form-select" name="role">
              ${(Object.keys(ROLE_LABELS) as AdminRole[])
                .map((r) => `<option value="${r}" ${admin.role === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`)
                .join('')}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Status</label>
            <select class="form-select" name="status">
              <option value="active" ${admin.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="suspended" ${admin.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer border-top">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-ltw" id="saveAdminRoleBtn">Save Changes</button>
      </div>
    </form>
  `;

  const modal = Modal.getOrCreateInstance(modalEl);
  modal.show();

  const form = contentEl.querySelector('#editAdminForm') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = contentEl.querySelector('#saveAdminRoleBtn') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await updateAdminProfile(admin.uid, {
        role: String(fd.get('role')) as AdminRole,
        status: String(fd.get('status')) as AdminStatus
      });
      modal.hide();
      showToast('Admin permissions updated.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Unable to update admin'), 'danger');
      btn.disabled = false;
    }
  });
}

export function renderUsersView(route: RouteKey): string {
  const me = state.adminProfile;

  if (route === 'users-roles') {
    const matrix = [
      { module: 'Dashboard & Reports', super: true, ops: true, content: true, support: true },
      { module: 'Destinations & Packages', super: true, ops: true, content: true, support: false },
      { module: 'Bookings & Payments', super: true, ops: true, content: false, support: true },
      { module: 'Customer Profiles', super: true, ops: true, content: false, support: true },
      { module: 'Enquiries & Messages', super: true, ops: true, content: false, support: true },
      { module: 'Fleet & Transportation', super: true, ops: true, content: false, support: false },
      { module: 'CMS & SEO Marketing', super: true, ops: true, content: true, support: false },
      { module: 'Admin Users & System Settings', super: true, ops: false, content: false, support: false }
    ];

    return `
      <div class="mb-4">
        <h4 class="mb-1 fw-bold">Roles & Permissions Matrix</h4>
        <p class="text-muted small mb-0">Role-based access control enforced both in UI and Firestore security rules.</p>
      </div>
      <div class="ltw-card overflow-hidden">
        <div class="table-responsive">
          <table class="table ltw-table">
            <thead>
              <tr>
                <th>Module / Capability</th>
                <th class="text-center">Super Admin</th>
                <th class="text-center">Operations Manager</th>
                <th class="text-center">Content Editor</th>
                <th class="text-center">Support Agent</th>
              </tr>
            </thead>
            <tbody>
              ${matrix
                .map(
                  (row) => `
                <tr>
                  <td class="fw-medium">${row.module}</td>
                  <td class="text-center">${row.super ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-dash text-muted"></i>'}</td>
                  <td class="text-center">${row.ops ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-dash text-muted"></i>'}</td>
                  <td class="text-center">${row.content ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-dash text-muted"></i>'}</td>
                  <td class="text-center">${row.support ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-dash text-muted"></i>'}</td>
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

  if (route === 'users-profile') {
    return `
      <div class="mb-4">
        <h4 class="mb-1 fw-bold">Profile Management</h4>
        <p class="text-muted small mb-0">Update your administrator display name and contact phone.</p>
      </div>
      <div class="row">
        <div class="col-lg-7">
          <form id="myProfileForm" class="ltw-card p-4" novalidate>
            <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
              ${
                me?.photoUrl
                  ? `<img src="${escapeHtml(me.photoUrl)}" alt="${escapeHtml(me.displayName)}" class="ltw-avatar" style="width: 56px; height: 56px;" referrerpolicy="no-referrer" />`
                  : `<span class="ltw-avatar" style="width: 56px; height: 56px; font-size: 20px;">${escapeHtml((me?.displayName || 'A').slice(0, 2).toUpperCase())}</span>`
              }
              <div>
                <div class="fw-bold fs-5">${escapeHtml(me?.displayName || 'Admin')}</div>
                <div class="small text-muted">${escapeHtml(me?.email || '')} · ${ROLE_LABELS[me?.role || 'super_admin']}</div>
              </div>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Display Name *</label>
                <input type="text" class="form-control" name="displayName" required minlength="2" maxlength="120" value="${escapeHtml(me?.displayName || '')}" />
                <div class="invalid-feedback">Display name must be at least 2 characters.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Contact Phone</label>
                <input type="text" class="form-control" name="phone" maxlength="30" value="${escapeHtml(me?.phone || '')}" placeholder="+91 ..." />
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-ltw" id="saveProfileBtn">Save Profile</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="mb-1 fw-bold">Admin Users</h4>
        <p class="text-muted small mb-0">Manage administrator accounts, pending invitations, and role access.</p>
      </div>
      <button type="button" class="btn btn-sm btn-ltw" id="inviteAdminBtn">
        <i class="bi bi-person-plus me-1"></i>Invite Admin
      </button>
    </div>

    <div class="ltw-card overflow-hidden mb-4">
      <div class="p-3 px-4 border-bottom fw-semibold small">Active & Suspended Administrators</div>
      <div class="table-responsive">
        <table class="table ltw-table">
          <thead>
            <tr>
              <th>Administrator</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.admins
              .map(
                (a) => `
              <tr>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    ${
                      a.photoUrl
                        ? `<img src="${escapeHtml(a.photoUrl)}" alt="${escapeHtml(a.displayName)}" class="ltw-avatar" referrerpolicy="no-referrer" />`
                        : `<span class="ltw-avatar">${escapeHtml(a.displayName.slice(0, 2).toUpperCase())}</span>`
                    }
                    <div>
                      <div class="fw-semibold">${escapeHtml(a.displayName)} ${a.uid === me?.uid ? '<span class="small text-muted">(You)</span>' : ''}</div>
                      <div class="small text-muted">${escapeHtml(a.email)}</div>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(ROLE_LABELS[a.role] || a.role)}</td>
                <td>${renderStatusLabel(a.status)}</td>
                <td class="small text-muted">${formatDate(a.createdAt)}</td>
                <td class="text-end text-nowrap">
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-edit-admin="${escapeHtml(a.uid)}" title="Edit Role"><i class="bi bi-pencil"></i></button>
                  ${
                    a.uid !== me?.uid
                      ? `<button type="button" class="btn btn-sm btn-outline-danger ms-1" data-del-admin="${escapeHtml(a.uid)}" title="Remove"><i class="bi bi-trash"></i></button>`
                      : ''
                  }
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${
      state.adminInvites.length > 0
        ? `<div class="ltw-card overflow-hidden">
            <div class="p-3 px-4 border-bottom fw-semibold small">Pending Admin Invitations</div>
            <div class="table-responsive">
              <table class="table ltw-table">
                <thead><tr><th>Name</th><th>Email</th><th>Invited Role</th><th class="text-end">Action</th></tr></thead>
                <tbody>
                  ${state.adminInvites
                    .map(
                      (inv) => `
                    <tr>
                      <td class="fw-medium">${escapeHtml(inv.displayName)}</td>
                      <td>${escapeHtml(inv.email)}</td>
                      <td>${escapeHtml(ROLE_LABELS[inv.role] || inv.role)}</td>
                      <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-danger" data-del-invite="${escapeHtml(inv.id)}">Revoke</button>
                      </td>
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
  `;
}

export function bindUsersEvents(root: HTMLElement, route: RouteKey): void {
  root.querySelector('#inviteAdminBtn')?.addEventListener('click', () => openInviteModal());

  root.querySelectorAll<HTMLElement>('[data-edit-admin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const adm = state.admins.find((a) => a.uid === btn.dataset.editAdmin);
      if (adm) openEditAdminModal(adm);
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-admin]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const adm = state.admins.find((a) => a.uid === btn.dataset.delAdmin);
      if (!adm) return;
      const ok = await confirmDialog({
        title: 'Remove Administrator',
        message: `Revoke admin access for ${adm.displayName} (${adm.email})?`,
        confirmLabel: 'Remove'
      });
      if (!ok) return;
      try {
        await deleteAdminUser(adm.uid);
        showToast('Administrator removed.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to remove admin'), 'danger');
      }
    });
  });

  root.querySelectorAll<HTMLElement>('[data-del-invite]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delInvite;
      if (!id) return;
      try {
        await deleteAdminInvite(id);
        showToast('Invitation revoked.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to revoke invite'), 'danger');
      }
    });
  });

  if (route === 'users-profile') {
    const form = root.querySelector('#myProfileForm') as HTMLFormElement | null;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.adminProfile) return;
      const nameEl = form.elements.namedItem('displayName') as HTMLInputElement | null;
      if (nameEl) nameEl.setCustomValidity(nameEl.value.trim().length < 2 ? 'Must be at least 2 characters.' : '');

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        const firstInvalid = form.querySelector<HTMLElement>(':invalid');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus({ preventScroll: true });
        }
        showToast('Please enter a valid display name.', 'warning');
        return;
      }

      const fd = new FormData(form);
      const btn = form.querySelector('#saveProfileBtn') as HTMLButtonElement | null;
      if (btn) btn.disabled = true;
      try {
        await updateAdminProfile(state.adminProfile.uid, {
          displayName: String(fd.get('displayName')).trim(),
          phone: String(fd.get('phone') || '').trim()
        });
        showToast('Profile saved.');
      } catch (err) {
        showToast(extractErrorMessage(err, 'Unable to save profile'), 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
}
