const params = new URLSearchParams(location.search);
const categoryId = params.get('id');
const categoryName = params.get('name') || 'Nominees';
document.getElementById('cat-title').textContent = categoryName;

let currentNomineeId = null;
let currentNomineeName = '';
const VOTE_PRICE = 20;

async function loadNominees() {
  const el = document.getElementById('nominees');
  try {
    const res = await fetch(`${API_BASE}/nominees?category_id=${categoryId}`);
    const nominees = await res.json();

    if (!nominees.length) {
      el.innerHTML = '<p style="color:var(--text-dim)">No nominees added for this category yet.</p>';
      return;
    }

    el.innerHTML = nominees
      .map(
        (n) => `
      <div class="nominee-card">
        <img src="${n.photo_url || 'https://placehold.co/300x300?text=' + encodeURIComponent(n.full_name)}" alt="${n.full_name}" />
        <div class="info">
          <h4>${n.full_name}</h4>
          <div class="votes">${n.votes_count || 0} votes</div>
          <button class="btn" onclick="openModal('${n.id}', '${n.full_name.replace(/'/g, "\\'")}')">Vote</button>
        </div>
      </div>
    `
      )
      .join('');
  } catch (err) {
    el.innerHTML = '<p style="color:var(--red)">Could not load nominees. Please refresh.</p>';
    console.error(err);
  }
}

function openModal(id, name) {
  currentNomineeId = id;
  currentNomineeName = name;
  document.getElementById('modal-nominee-name').textContent = `Vote for ${name}`;
  document.getElementById('vote-count').value = 1;
  document.getElementById('phone').value = '';
  document.getElementById('status-msg').textContent = '';
  document.getElementById('status-msg').className = 'status-msg';
  updateTotal();
  document.getElementById('vote-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('vote-modal').style.display = 'none';
}

function updateTotal() {
  const votes = parseInt(document.getElementById('vote-count').value) || 1;
  document.getElementById('total-amount').textContent = votes * VOTE_PRICE;
}

async function submitVote() {
  const votes = parseInt(document.getElementById('vote-count').value);
  const phone = document.getElementById('phone').value.trim();
  const statusEl = document.getElementById('status-msg');
  const btn = document.getElementById('submit-vote-btn');

  if (!votes || votes < 1) return showStatus('Enter a valid number of votes', 'error');
  if (!/^0[17]\d{8}$/.test(phone)) return showStatus('Enter a valid Safaricom number e.g. 0712345678', 'error');

  btn.disabled = true;
  showStatus('Sending STK push to your phone…', 'pending');

  try {
    const res = await fetch(`${API_BASE}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nominee_id: currentNomineeId, phone, votes }),
    });
    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error || 'Payment could not be started', 'error');
      btn.disabled = false;
      return;
    }

    showStatus('Enter your M-Pesa PIN on your phone to confirm…', 'pending');
    pollStatus(data.reference, btn);
  } catch (err) {
    showStatus('Network error — please try again', 'error');
    btn.disabled = false;
  }
}

async function pollStatus(reference, btn) {
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`${API_BASE}/vote/verify/${reference}`);
      const data = await res.json();

      if (data.status === 'success') {
        clearInterval(interval);
        showStatus('Vote confirmed! Thank you for voting.', 'success');
        btn.disabled = false;
        loadNominees();
        setTimeout(closeModal, 2000);
      } else if (data.status === 'failed' || data.status === 'abandoned') {
        clearInterval(interval);
        showStatus('Payment failed or was cancelled. Please try again.', 'error');
        btn.disabled = false;
      }
    } catch (err) {
      // keep polling
    }

    if (attempts >= 20) {
      clearInterval(interval);
      showStatus('Still waiting for confirmation — check your phone or try again.', 'error');
      btn.disabled = false;
    }
  }, 3000);
}

function showStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

loadNominees();
