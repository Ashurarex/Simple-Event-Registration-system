/**
 * app.js — Frontend logic for Event Registration Management System
 *
 * IMPORTANT: This file does NOT perform any filtering, sorting or searching.
 * All query operations are delegated to the Express backend via API calls.
 * The backend constructs real MongoDB queries and returns only matching records.
 */

'use strict';

const API = '/api/registrations';

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────
let currentEditId = null;
let deleteTargetId = null;
let deleteTargetName = null;
let viewDetailId = null;

// ─────────────────────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────────────────────
const form = document.getElementById('registration-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const fillSampleBtn = document.getElementById('fill-sample-btn');
const cancelBtn = document.getElementById('cancel-btn');
const clearBtn = document.getElementById('clear-btn');
const editIdInput = document.getElementById('edit-id');
const tableBody = document.getElementById('table-body');
const noResults = document.getElementById('no-results');
const loadingEl = document.getElementById('loading');
const resultCount = document.getElementById('result-count');
const toast = document.getElementById('toast');
const activeFilters = document.getElementById('active-filters');
const queryDetails = document.getElementById('query-info-details');
const queryPre = document.getElementById('query-info-pre');

const detailModal = document.getElementById('detail-modal');
const modalContent = document.getElementById('modal-content');
const modalEditBtn = document.getElementById('modal-edit-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeModalBtn2 = document.getElementById('close-modal-btn2');

const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// Filter inputs
const searchName = document.getElementById('search-name');
const searchId = document.getElementById('search-id');
const searchOr = document.getElementById('search-or');
const filterEventName = document.getElementById('filter-event-name');
const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');
const filterStatusNe = document.getElementById('filter-status-ne');
const filterDateFrom = document.getElementById('filter-date-from');
const filterDateTo = document.getElementById('filter-date-to');
const filterFeeGt = document.getElementById('filter-fee-gt');
const filterFeeLt = document.getElementById('filter-fee-lt');
const filterFeeGte = document.getElementById('filter-fee-gte');
const filterFeeLte = document.getElementById('filter-fee-lte');
const filterFeeNe = document.getElementById('filter-fee-ne');
const catCheckboxes = document.querySelectorAll('.cat-checkbox');
const sortBy = document.getElementById('sort-by');
const sortOrder = document.getElementById('sort-order');

const applyFiltersBtn = document.getElementById('apply-filters-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// ─────────────────────────────────────────────────────────────
// Toast Notification
// ─────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast hidden'; }, 3500);
}

// ─────────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ─────────────────────────────────────────────────────────────
// Load Registrations
// Builds query params from filter UI and sends them to the backend.
// The backend constructs the actual MongoDB query and returns results.
// ─────────────────────────────────────────────────────────────
async function loadRegistrations() {
  showLoading(true);

  // Build query params — these are sent to the backend which will
  // construct proper MongoDB query operators ($gt, $lt, $and, $in, etc.)
  const params = new URLSearchParams();

  const nameVal = searchName.value.trim();
  const idVal = searchId.value.trim();
  const orVal = searchOr.value.trim();
  const evtName = filterEventName.value.trim();
  const catVal = filterCategory.value.trim();
  const statusVal = filterStatus.value.trim();
  const statusNe = filterStatusNe.value.trim();
  const dateFrom = filterDateFrom.value;
  const dateTo = filterDateTo.value;
  const feeGt = filterFeeGt.value;
  const feeLt = filterFeeLt.value;
  const feeGte = filterFeeGte.value;
  const feeLte = filterFeeLte.value;
  const feeNe = filterFeeNe.value;

  // $in: collect checked categories
  const checkedCats = [...catCheckboxes]
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (nameVal) params.set('search', nameVal);
  if (idVal) params.set('searchById', idVal);
  if (orVal) params.set('orSearch', orVal);
  if (evtName) params.set('eventName', evtName);

  // Category: multi-select ($in) overrides dropdown if checkboxes used
  if (checkedCats.length > 0) {
    params.set('eventCategory', checkedCats.join(','));
  } else if (catVal) {
    params.set('eventCategory', catVal);
  }

  if (statusNe) params.set('paymentNe', statusNe);
  else if (statusVal) params.set('paymentStatus', statusVal);

  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (feeGt !== '') params.set('feeGt', feeGt);
  if (feeLt !== '') params.set('feeLt', feeLt);
  if (feeGte !== '') params.set('feeGte', feeGte);
  if (feeLte !== '') params.set('feeLte', feeLte);
  if (feeNe !== '') params.set('feeNe', feeNe);

  params.set('sortBy', sortBy.value);
  params.set('sortOrder', sortOrder.value);

  try {
    const data = await apiFetch(`${API}?${params.toString()}`);
    renderTable(data.data);
    updateResultCount(data.count);
    renderActiveFilters(params);
    renderQueryInfo(data.query, data.sortBy, data.sortOrder);
  } catch (err) {
    showToast('Failed to load registrations: ' + err.message, 'error');
    console.error(err);
  } finally {
    showLoading(false);
  }
}

// ─────────────────────────────────────────────────────────────
// Render Table Rows
// ─────────────────────────────────────────────────────────────
function renderTable(registrations) {
  tableBody.innerHTML = '';

  if (!registrations || registrations.length === 0) {
    noResults.classList.remove('hidden');
    document.getElementById('registrations-table').style.display = 'none';
    return;
  }

  noResults.classList.add('hidden');
  document.getElementById('registrations-table').style.display = '';

  registrations.forEach(reg => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(reg.registrationId || '—')}</strong></td>
      <td>${escapeHtml(reg.participantName)}</td>
      <td>${escapeHtml(reg.eventName)}</td>
      <td><span class="cat-badge">${escapeHtml(reg.eventCategory)}</span></td>
      <td>${formatDate(reg.registrationDate)}</td>
      <td>₹${Number(reg.fee).toLocaleString('en-IN')}</td>
      <td><span class="status-badge status-${reg.paymentStatus}">${reg.paymentStatus}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="viewDetail('${reg._id}')">View</button>
          <button class="btn btn-sm btn-primary" onclick="startEdit('${reg._id}')">Edit</button>
          <button class="btn btn-sm btn-danger"  onclick="confirmDelete('${reg._id}', '${escapeHtml(reg.participantName).replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────────────────────
// Active Filters Badge Display
// ─────────────────────────────────────────────────────────────
function renderActiveFilters(params) {
  const labels = {
    search: 'Name contains',
    searchById: 'ID =',
    orSearch: 'Name OR Event =',
    eventName: 'Event =',
    eventCategory: 'Category $in',
    paymentStatus: 'Status =',
    paymentNe: 'Status $ne',
    dateFrom: 'Date ≥',
    dateTo: 'Date ≤',
    feeGt: 'Fee $gt',
    feeLt: 'Fee $lt',
    feeGte: 'Fee $gte',
    feeLte: 'Fee $lte',
    feeNe: 'Fee $ne',
  };

  const tags = [];
  for (const [key, label] of Object.entries(labels)) {
    const val = params.get(key);
    if (val) tags.push({ label, val });
  }

  if (tags.length === 0) {
    activeFilters.classList.add('hidden');
    return;
  }

  activeFilters.classList.remove('hidden');
  activeFilters.innerHTML = '<span class="filter-tag-label">Active filters:</span> ' +
    tags.map(t => `<span class="filter-tag">${t.label}: ${escapeHtml(t.val)}</span>`).join('');
}

// ─────────────────────────────────────────────────────────────
// MongoDB Query Info Display
// Shows the actual query object the backend sent to MongoDB
// ─────────────────────────────────────────────────────────────
function renderQueryInfo(query, sortField, order) {
  if (!query || Object.keys(query).length === 0) {
    queryDetails.classList.add('hidden');
    return;
  }
  queryDetails.classList.remove('hidden');
  queryPre.textContent =
    `// MongoDB query executed on backend:\n` +
    `Registration.find(${JSON.stringify(query, null, 2)})\n` +
    `  .sort({ ${sortField}: ${order === 'asc' ? 1 : -1} })`;
}

function updateResultCount(count) {
  resultCount.textContent = `${count} record${count !== 1 ? 's' : ''}`;
}

// ─────────────────────────────────────────────────────────────
// View Registration Detail Modal
// ─────────────────────────────────────────────────────────────
async function viewDetail(id) {
  try {
    const data = await apiFetch(`${API}/${id}`);
    const reg = data.data;
    viewDetailId = id;

    modalContent.innerHTML = `
      <table class="detail-table">
        <tr><td>Registration ID</td><td><strong style="color:var(--primary);">${escapeHtml(reg.registrationId || '—')}</strong></td></tr>
        <tr><td>MongoDB _id</td><td><code>${reg._id}</code></td></tr>
        <tr><td>Participant Name</td><td>${escapeHtml(reg.participantName)}</td></tr>
        <tr><td>Email</td><td>${escapeHtml(reg.email)}</td></tr>
        <tr><td>Phone</td><td>${escapeHtml(reg.phone)}</td></tr>
        <tr><td>Event Name</td><td>${escapeHtml(reg.eventName)}</td></tr>
        <tr><td>Event Category</td><td><span class="cat-badge">${escapeHtml(reg.eventCategory)}</span></td></tr>
        <tr><td>Registration Date</td><td>${formatDate(reg.registrationDate)}</td></tr>
        <tr><td>Fee</td><td>₹${Number(reg.fee).toLocaleString('en-IN')}</td></tr>
        <tr><td>Payment Status</td><td><span class="status-badge status-${reg.paymentStatus}">${reg.paymentStatus}</span></td></tr>
        <tr><td>Created At</td><td>${new Date(reg.createdAt).toLocaleString()}</td></tr>
        <tr><td>Updated At</td><td>${new Date(reg.updatedAt).toLocaleString()}</td></tr>
      </table>
    `;

    detailModal.classList.remove('hidden');
  } catch (err) {
    showToast('Failed to load registration details: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// Edit Registration
// ─────────────────────────────────────────────────────────────
async function startEdit(id) {
  detailModal.classList.add('hidden');
  try {
    const data = await apiFetch(`${API}/${id}`);
    const reg = data.data;

    currentEditId = id;
    editIdInput.value = id;

    document.getElementById('participantName').value = reg.participantName;
    document.getElementById('email').value = reg.email;
    document.getElementById('phone').value = reg.phone;
    document.getElementById('eventName').value = reg.eventName;
    document.getElementById('eventCategory').value = reg.eventCategory;
    document.getElementById('registrationDate').value = reg.registrationDate
      ? new Date(reg.registrationDate).toISOString().split('T')[0]
      : '';
    document.getElementById('fee').value = reg.fee;
    document.getElementById('paymentStatus').value = reg.paymentStatus;

    formTitle.textContent = 'Edit Registration';
    submitBtn.textContent = 'Update Registration';
    cancelBtn.classList.remove('hidden');

    // Scroll to form
    document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Failed to load registration for editing: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// Delete Confirmation
// ─────────────────────────────────────────────────────────────
function confirmDelete(id, name) {
  deleteTargetId = id;
  deleteTargetName = name;
  confirmMessage.textContent = `Are you sure you want to delete the registration for "${name}"?`;
  confirmModal.classList.remove('hidden');
}

async function executeDelete() {
  if (!deleteTargetId) return;
  try {
    await apiFetch(`${API}/${deleteTargetId}`, { method: 'DELETE' });
    showToast(`Registration for "${deleteTargetName}" deleted successfully.`, 'success');
    confirmModal.classList.add('hidden');
    deleteTargetId = null;
    deleteTargetName = null;
    await loadRegistrations();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// Form Submission (Create / Update)
// ─────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    participantName: document.getElementById('participantName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    eventName: document.getElementById('eventName').value.trim(),
    eventCategory: document.getElementById('eventCategory').value,
    registrationDate: document.getElementById('registrationDate').value,
    fee: Number(document.getElementById('fee').value),
    paymentStatus: document.getElementById('paymentStatus').value,
  };

  try {
    if (currentEditId) {
      await apiFetch(`${API}/${currentEditId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Registration updated successfully!', 'success');
      resetForm();
    } else {
      await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Registration added successfully!', 'success');
      resetForm();
    }
    await loadRegistrations();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
});

// ─────────────────────────────────────────────────────────────
// Form Validation (client-side, pre-flight only)
// ─────────────────────────────────────────────────────────────
function validateForm() {
  clearErrors();
  let valid = true;

  const name = document.getElementById('participantName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const event = document.getElementById('eventName').value.trim();
  const cat = document.getElementById('eventCategory').value;
  const date = document.getElementById('registrationDate').value;
  const fee = document.getElementById('fee').value;
  const stat = document.getElementById('paymentStatus').value;

  if (!name || name.length < 2) {
    setError('err-participantName', 'participantName', 'Name must be at least 2 characters.');
    valid = false;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    setError('err-email', 'email', 'Please enter a valid email address.');
    valid = false;
  }
  if (!phone || phone.length < 7) {
    setError('err-phone', 'phone', 'Please enter a valid phone number.');
    valid = false;
  }
  if (!event || event.length < 2) {
    setError('err-eventName', 'eventName', 'Event name must be at least 2 characters.');
    valid = false;
  }
  if (!cat) {
    setError('err-eventCategory', 'eventCategory', 'Please select an event category.');
    valid = false;
  }
  if (!date) {
    setError('err-registrationDate', 'registrationDate', 'Please select a registration date.');
    valid = false;
  }
  if (fee === '' || isNaN(Number(fee)) || Number(fee) < 0) {
    setError('err-fee', 'fee', 'Please enter a valid fee (0 or more).');
    valid = false;
  }
  if (!stat) {
    setError('err-paymentStatus', 'paymentStatus', 'Please select a payment status.');
    valid = false;
  }

  return valid;
}

function setError(errId, fieldId, msg) {
  document.getElementById(errId).textContent = msg;
  document.getElementById(fieldId).classList.add('invalid');
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.form-group input, .form-group select')
    .forEach(el => el.classList.remove('invalid'));
}

// ─────────────────────────────────────────────────────────────
// Reset Form
// ─────────────────────────────────────────────────────────────
function resetForm() {
  form.reset();
  clearErrors();
  currentEditId = null;
  editIdInput.value = '';
  formTitle.textContent = 'Add New Registration';
  submitBtn.textContent = 'Add Registration';
  cancelBtn.classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────
function showLoading(show) {
  loadingEl.classList.toggle('hidden', !show);
  if (show) {
    document.getElementById('registrations-table').style.display = 'none';
    noResults.classList.add('hidden');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────
cancelBtn.addEventListener('click', resetForm);
clearBtn.addEventListener('click', resetForm);

// Fill sample inputs for easy testing
const sampleInputs = [
  {
    participantName: 'Aditya Kulkarni',
    email: 'aditya.kulkarni@example.com',
    phone: '9822012345',
    eventName: 'FullStack Hackathon',
    eventCategory: 'Technical',
    registrationDate: '2026-07-10',
    fee: 400,
    paymentStatus: 'Paid',
  },
  {
    participantName: 'Sanya Malhotra',
    email: 'sanya.m@example.com',
    phone: '9730123456',
    eventName: 'Classical Fusion Music',
    eventCategory: 'Cultural',
    registrationDate: '2026-07-15',
    fee: 250,
    paymentStatus: 'Pending',
  },
  {
    participantName: 'Tanmay Bhatt',
    email: 'tanmay.b@example.com',
    phone: '9655123456',
    eventName: 'AI Prompt Engineering',
    eventCategory: 'Workshop',
    registrationDate: '2026-07-20',
    fee: 600,
    paymentStatus: 'Paid',
  },
  {
    participantName: 'Divya Deshmukh',
    email: 'divya.chess@example.com',
    phone: '9544123456',
    eventName: 'Inter-College Chess Blitz',
    eventCategory: 'Sports',
    registrationDate: '2026-07-25',
    fee: 150,
    paymentStatus: 'Paid',
  },
];

let sampleIdx = 0;
if (fillSampleBtn) {
  fillSampleBtn.addEventListener('click', () => {
    const item = sampleInputs[sampleIdx % sampleInputs.length];
    sampleIdx++;
    document.getElementById('participantName').value = item.participantName;
    document.getElementById('email').value = item.email;
    document.getElementById('phone').value = item.phone;
    document.getElementById('eventName').value = item.eventName;
    document.getElementById('eventCategory').value = item.eventCategory;
    document.getElementById('registrationDate').value = item.registrationDate;
    document.getElementById('fee').value = item.fee;
    document.getElementById('paymentStatus').value = item.paymentStatus;
    clearErrors();
    showToast('Loaded sample input: ' + item.participantName, 'info');
  });
}

applyFiltersBtn.addEventListener('click', loadRegistrations);
resetFiltersBtn.addEventListener('click', () => {
  searchName.value = '';
  searchId.value = '';
  searchOr.value = '';
  filterEventName.value = '';
  filterCategory.value = '';
  filterStatus.value = '';
  filterStatusNe.value = '';
  filterDateFrom.value = '';
  filterDateTo.value = '';
  filterFeeGt.value = '';
  filterFeeLt.value = '';
  filterFeeGte.value = '';
  filterFeeLte.value = '';
  filterFeeNe.value = '';
  catCheckboxes.forEach(cb => cb.checked = false);
  sortBy.value = 'createdAt';
  sortOrder.value = 'desc';
  loadRegistrations();
});

// Allow pressing Enter in search inputs to apply filters
[searchName, searchId, searchOr, filterEventName,
  filterFeeGt, filterFeeLt, filterFeeGte, filterFeeLte, filterFeeNe
].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') loadRegistrations(); });
});

// Modal close buttons
closeModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
closeModalBtn2.addEventListener('click', () => detailModal.classList.add('hidden'));
detailModal.addEventListener('click', e => {
  if (e.target === detailModal) detailModal.classList.add('hidden');
});

modalEditBtn.addEventListener('click', () => {
  if (viewDetailId) startEdit(viewDetailId);
});

confirmDeleteBtn.addEventListener('click', executeDelete);
cancelDeleteBtn.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
  deleteTargetId = null;
  deleteTargetName = null;
});
confirmModal.addEventListener('click', e => {
  if (e.target === confirmModal) confirmModal.classList.add('hidden');
});

// Expose functions used by inline onclick handlers
window.viewDetail = viewDetail;
window.startEdit = startEdit;
window.confirmDelete = confirmDelete;

// ─────────────────────────────────────────────────────────────
// Initial Load
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadRegistrations();
});
