let token = localStorage.getItem('kpea_admin_token') || null;
let categoriesCache = [];

function authHeaders() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Wraps fetch for authenticated admin calls. If the token is invalid/expired (401),
// automatically logs out and returns to the login screen instead of failing silently.
async function authFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  if (res.status === 401) {
    logout('Your session expired — please log in again.');
    throw new Error('Session expired');
  }
  return res;
}

function logout(message) {
  token = null;
  localStorage.removeItem('kpea_admin_token');
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
  document.getElementById('login-error').textContent = message || '';
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('login-error').textContent = data.error || 'Login failed';
      return;
    }
    token = data.token;
    localStorage.setItem('kpea_admin_token', token);
    showAdminPanel();
  } catch (err) {
    document.getElementById('login-error').textContent = 'Network error';
  }
}

function showAdminPanel() {
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  loadVotingStatus();
  loadRevenue();
  loadCategories();
  loadVotes();
  loadApplications();
  loadSupport();
}

async function loadVotingStatus() {
  const res = await fetch(`${API_BASE}/settings/voting-status`);
  const data = await res.json();
  document.getElementById('voting-status-text').textContent = data.voting_open ? 'Voting is OPEN' : 'Voting is CLOSED';
}

async function toggleVoting(open) {
  try {
    await authFetch(`${API_BASE}/admin/settings/voting-status`, {
      method: 'PUT',
      body: JSON.stringify({ voting_open: open }),
    });
    loadVotingStatus();
  } catch (err) {}
}

async function loadRevenue() {
  try {
    const res = await authFetch(`${API_BASE}/admin/revenue`);
    const data = await res.json();
    document.getElementById('revenue-text').textContent =
      `KSh ${data.total_revenue_ksh || 0} total \u2014 KSh ${data.vote_revenue_ksh || 0} from ${data.successful_votes || 0} votes, ` +
      `KSh ${data.coffee_revenue_ksh || 0} from ${data.successful_coffee_orders || 0} coffee orders`;
  } catch (err) {}
}

async function loadCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  categoriesCache = await res.json();

  const tbody = document.querySelector('#categories-table tbody');
  tbody.innerHTML = categoriesCache
    .map((c) => `<tr><td>${c.name}</td><td>${c.slug}</td><td><button class="btn" style="width:auto;background:var(--red)" onclick="deleteCategory('${c.id}')">Delete</button></td></tr>`)
    .join('');

  const select = document.getElementById('nominee-category');
  select.innerHTML = categoriesCache.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');

  loadNominees();
}

async function addCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  const slug = document.getElementById('new-cat-slug').value.trim();
  if (!name || !slug) return alert('Enter name and slug');

  try {
    await authFetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      body: JSON.stringify({ name, slug, sort_order: categoriesCache.length + 1 }),
    });
    document.getElementById('new-cat-name').value = '';
    document.getElementById('new-cat-slug').value = '';
    loadCategories();
  } catch (err) {}
}

async function deleteCategory(id) {
  if (!confirm('Delete this category and all its nominees?')) return;
  try {
    await authFetch(`${API_BASE}/admin/categories/${id}`, { method: 'DELETE' });
    loadCategories();
  } catch (err) {}
}

async function loadNominees() {
  const res = await fetch(`${API_BASE}/nominees`);
  const nominees = await res.json();
  const catMap = Object.fromEntries(categoriesCache.map((c) => [c.id, c.name]));

  const tbody = document.querySelector('#nominees-table tbody');
  tbody.innerHTML = nominees
    .map(
      (n) => `<tr>
        <td>${n.full_name}</td>
        <td>${catMap[n.category_id] || ''}</td>
        <td>${n.votes_count || 0}</td>
        <td>
          <input type="number" id="adjust-${n.id}" placeholder="\u00b1 votes" style="width:80px;" />
          <button class="btn" style="width:auto;" onclick="addManualVotes('${n.id}')">Apply</button>
        </td>
        <td><button class="btn" style="width:auto;background:var(--red)" onclick="deleteNominee('${n.id}')">Delete</button></td>
      </tr>`
    )
    .join('');
}

async function addManualVotes(nomineeId) {
  const input = document.getElementById(`adjust-${nomineeId}`);
  const votes = parseInt(input.value, 10);
  if (!votes || votes === 0) return alert('Enter a non-zero number (e.g. 5 to add, -3 to remove)');

  const note = prompt('Optional note for this manual adjustment (e.g. "failed STK, phone 07XX"):', '') || '';

  try {
    const res = await authFetch(`${API_BASE}/admin/nominees/${nomineeId}/add-votes`, {
      method: 'POST',
      body: JSON.stringify({ votes, note }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to adjust votes');

    input.value = '';
    loadNominees();
    loadVotes();
  } catch (err) {
    if (err.message !== 'Session expired') alert('Network error while adjusting votes');
  }
}

async function addNominee() {
  const category_id = document.getElementById('nominee-category').value;
  const full_name = document.getElementById('new-nominee-name').value.trim();
  const photo_url = document.getElementById('new-nominee-photo').value.trim();
  if (!category_id || !full_name) return alert('Select a category and enter a name');

  try {
    await authFetch(`${API_BASE}/admin/nominees`, {
      method: 'POST',
      body: JSON.stringify({ category_id, full_name, photo_url }),
    });
    document.getElementById('new-nominee-name').value = '';
    document.getElementById('new-nominee-photo').value = '';
    loadNominees();
  } catch (err) {}
}

async function deleteNominee(id) {
  if (!confirm('Delete this nominee?')) return;
  try {
    await authFetch(`${API_BASE}/admin/nominees/${id}`, { method: 'DELETE' });
    loadNominees();
  } catch (err) {}
}

let votesCache = [];

async function loadVotes() {
  try {
    const res = await authFetch(`${API_BASE}/admin/votes`);
    votesCache = await res.json();

    const tbody = document.querySelector('#votes-table tbody');
    tbody.innerHTML = votesCache
      .map(
        (v) => `<tr>
          <td>${v.nominees?.full_name || ''}</td>
          <td>${v.categories?.name || ''}</td>
          <td>${v.phone}</td>
          <td>${v.vote_count}</td>
          <td>KSh ${v.amount}</td>
          <td>${v.status}</td>
          <td>${new Date(v.created_at).toLocaleString()}</td>
        </tr>`
      )
      .join('');
  } catch (err) {}
}

function exportVotesCSV() {
  const header = 'Nominee,Category,Phone,Votes,Amount,Status,Time\n';
  const rows = votesCache
    .map((v) =>
      [v.nominees?.full_name, v.categories?.name, v.phone, v.vote_count, v.amount, v.status, v.created_at]
        .map((x) => `"${x ?? ''}"`)
        .join(',')
    )
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kpea-votes-${Date.now()}.csv`;
  a.click();
}

async function loadApplications() {
  try {
    const res = await authFetch(`${API_BASE}/admin/applications`);
    const applications = await res.json();

    const tbody = document.querySelector('#applications-table tbody');
    tbody.innerHTML = applications
      .map((a) => {
        const canReview = a.payment_status === 'success' && a.review_status === 'pending';
        const actions = canReview
          ? `<button class="btn" style="width:auto;" onclick="reviewApplication('${a.id}','accept')">Accept</button>
             <button class="btn" style="width:auto;background:var(--red)" onclick="reviewApplication('${a.id}','reject')">Reject</button>`
          : '';
        return `<tr>
          <td>${a.full_name}</td>
          <td>${a.categories?.name || ''}</td>
          <td>${a.facebook_url ? `<a href="${a.facebook_url}" target="_blank" style="color:var(--gold)">link</a>` : '—'}</td>
          <td>${a.email || '—'}</td>
          <td>${a.whatsapp}</td>
          <td>${a.payment_status}</td>
          <td>${a.review_status}</td>
          <td>${actions}</td>
        </tr>`;
      })
      .join('');
  } catch (err) {}
}

async function reviewApplication(id, action) {
  let note = '';
  if (action === 'reject') {
    note = prompt('Optional reason for rejecting (shown only in admin records):', '') || '';
  } else {
    if (!confirm('Accept this application and add them as a nominee?')) return;
  }

  try {
    const res = await authFetch(`${API_BASE}/admin/applications/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || `Failed to ${action} application`);

    loadApplications();
    if (action === 'accept') loadNominees();
  } catch (err) {
    if (err.message !== 'Session expired') alert('Network error while reviewing application');
  }
}

async function loadSupport() {
  try {
    const res = await authFetch(`${API_BASE}/admin/support`);
    const support = await res.json();

    const tbody = document.querySelector('#support-table tbody');
    tbody.innerHTML = support
      .map(
        (s) => `<tr>
          <td>${s.supporter_name || 'Anonymous'}</td>
          <td>${s.phone}</td>
          <td>${s.cups}</td>
          <td>KSh ${s.amount}</td>
          <td>${s.status}</td>
          <td>${new Date(s.created_at).toLocaleString()}</td>
        </tr>`
      )
      .join('');
  } catch (err) {}
}

if (token) showAdminPanel();
