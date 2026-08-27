let applyCategories = [];

async function ensureApplyCategoriesLoaded() {
  if (applyCategories.length) return;
  try {
    const res = await fetch(`${API_BASE}/categories`);
    applyCategories = await res.json();
    const select = document.getElementById('apply-category');
    select.innerHTML = applyCategories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  } catch (err) {
    console.error('Could not load categories for application form', err);
  }
}

async function openApplyModal() {
  await ensureApplyCategoriesLoaded();
  document.getElementById('apply-fullname').value = '';
  document.getElementById('apply-facebook').value = '';
  document.getElementById('apply-email').value = '';
  document.getElementById('apply-whatsapp').value = '';
  document.getElementById('apply-mpesa').value = '';
  document.getElementById('apply-status-msg').textContent = '';
  document.getElementById('apply-status-msg').className = 'status-msg';
  document.getElementById('apply-modal').style.display = 'flex';
}

function closeApplyModal() {
  document.getElementById('apply-modal').style.display = 'none';
}

function showApplyStatus(msg, type) {
  const el = document.getElementById('apply-status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

async function submitApplication() {
  const category_id = document.getElementById('apply-category').value;
  const full_name = document.getElementById('apply-fullname').value.trim();
  const facebook_url = document.getElementById('apply-facebook').value.trim();
  const email = document.getElementById('apply-email').value.trim();
  const whatsapp = document.getElementById('apply-whatsapp').value.trim();
  const mpesa_phone = document.getElementById('apply-mpesa').value.trim();
  const btn = document.getElementById('apply-submit-btn');

  if (!category_id) return showApplyStatus('Select a category', 'error');
  if (!full_name) return showApplyStatus('Enter your full name', 'error');
  if (!/^0[17]\d{8}$/.test(whatsapp)) return showApplyStatus('Enter a valid WhatsApp number e.g. 0712345678', 'error');
  if (!/^0[17]\d{8}$/.test(mpesa_phone)) return showApplyStatus('Enter a valid M-Pesa number e.g. 0712345678', 'error');

  btn.disabled = true;
  showApplyStatus('Sending STK push to your phone…', 'pending');

  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id, full_name, facebook_url, email, whatsapp, mpesa_phone }),
    });
    const data = await res.json();

    if (!res.ok) {
      showApplyStatus(data.error || 'Could not start payment', 'error');
      btn.disabled = false;
      return;
    }

    showApplyStatus('Enter your M-Pesa PIN on your phone to confirm the KSh 500 fee…', 'pending');
    pollApplicationStatus(data.reference, btn);
  } catch (err) {
    showApplyStatus('Network error — please try again', 'error');
    btn.disabled = false;
  }
}

function pollApplicationStatus(reference, btn) {
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`${API_BASE}/applications/verify/${reference}`);
      const data = await res.json();

      if (data.status === 'success') {
        clearInterval(interval);
        showApplyStatus('Payment confirmed! Your application has been submitted for review.', 'success');
        btn.disabled = false;
        setTimeout(closeApplyModal, 2500);
      } else if (data.status === 'failed' || data.status === 'abandoned') {
        clearInterval(interval);
        showApplyStatus('Payment failed or was cancelled. Please try again.', 'error');
        btn.disabled = false;
      }
    } catch (err) {
      // keep polling
    }

    if (attempts >= 20) {
      clearInterval(interval);
      showApplyStatus('Still waiting for confirmation — check your phone or try again.', 'error');
      btn.disabled = false;
    }
  }, 3000);
}
