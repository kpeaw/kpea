let token = localStorage.getItem('kpea_admin_token') || null;
let categoriesCache = [];

function authHeaders() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
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
}

async function loadVotingStatus() {
  const res = await fetch(`${API_BASE}/settings/voting-status`);
  const data = await res.json();
  document.getElementById('voting-status-text').textContent = data.voting_open ? 'Voting is OPEN' : 'Voting is CLOSED';
}

async function toggleVoting(open) {
  await fetch(`${API_BASE}/admin/settings/voting-status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ voting_open: open }),
  });
  loadVotingStatus();
}

async function loadRevenue() {
  const res = await fetch(`${API_BASE}/admin/revenue`, { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('revenue-text').textContent =
    `KSh ${data.total_revenue_ksh || 0} from ${data.successful_votes || 0} successful vote payments`;
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

  await fetch(`${API_BASE}/admin/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, slug, sort_order: categoriesCache.length + 1 }),
  });
  document.getElementById('new-cat-name').value = '';
  document.getElementById('new-cat-slug').value = '';
  loadCategories();
}

async function deleteCategory(id) {
  if (!confirm('Delete this category and all its nominees?')) return;
  await fetch(`${API_BASE}/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadCategories();
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
        <td><button class="btn" style="width:auto;background:var(--red)" onclick="deleteNominee('${n.id}')">Delete</button></td>
      </tr>`
    )
    .join('');
}

async function addNominee() {
  const category_id = document.getElementById('nominee-category').value;
  const full_name = document.getElementById('new-nominee-name').value.trim();
  const photo_url = document.getElementById('new-nominee-photo').value.trim();
  if (!category_id || !full_name) return alert('Select a category and enter a name');

  await fetch(`${API_BASE}/admin/nominees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ category_id, full_name, photo_url }),
  });
  document.getElementById('new-nominee-name').value = '';
  document.getElementById('new-nominee-photo').value = '';
  loadNominees();
}

async function deleteNominee(id) {
  if (!confirm('Delete this nominee?')) return;
  await fetch(`${API_BASE}/admin/nominees/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadNominees();
}

let votesCache = [];

async function loadVotes() {
  const res = await fetch(`${API_BASE}/admin/votes`, { headers: authHeaders() });
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

if (token) showAdminPanel();
