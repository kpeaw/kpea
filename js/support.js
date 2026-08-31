const COFFEE_PRICE = 100;

function openSupportModal() {
  document.getElementById('support-cups').value = 1;
  document.getElementById('support-name').value = '';
  document.getElementById('support-phone').value = '';
  document.getElementById('support-details').style.display = 'none';
  document.getElementById('support-status-msg').textContent = '';
  document.getElementById('support-status-msg').className = 'status-msg';
  updateSupportTotal();
  document.getElementById('support-modal').style.display = 'flex';
}

function closeSupportModal() {
  document.getElementById('support-modal').style.display = 'none';
}

function toggleSupportDetails() {
  const el = document.getElementById('support-details');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function updateSupportTotal() {
  const cups = parseInt(document.getElementById('support-cups').value) || 1;
  document.getElementById('support-total-amount').textContent = cups * COFFEE_PRICE;
}

function showSupportStatus(msg, type) {
  const el = document.getElementById('support-status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

async function submitSupport() {
  const cups = parseInt(document.getElementById('support-cups').value);
  const supporter_name = document.getElementById('support-name').value.trim();
  const phone = document.getElementById('support-phone').value.trim();
  const btn = document.getElementById('support-submit-btn');

  if (!cups || cups < 1) return showSupportStatus('Enter a valid number of cups', 'error');
  if (!/^0[17]\d{8}$/.test(phone)) return showSupportStatus('Enter a valid M-Pesa number e.g. 0712345678', 'error');

  btn.disabled = true;
  showSupportStatus('Sending STK push to your phone…', 'pending');

  try {
    const res = await fetch(`${API_BASE}/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cups, phone, supporter_name }),
    });
    const data = await res.json();

    if (!res.ok) {
      showSupportStatus(data.error || 'Payment could not be started', 'error');
      btn.disabled = false;
      return;
    }

    showSupportStatus('Enter your M-Pesa PIN on your phone to confirm…', 'pending');
    pollSupportStatus(data.reference, btn);
  } catch (err) {
    showSupportStatus('Network error — please try again', 'error');
    btn.disabled = false;
  }
}

function pollSupportStatus(reference, btn) {
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`${API_BASE}/support/verify/${reference}`);
      const data = await res.json();

      if (data.status === 'success') {
        clearInterval(interval);
        showSupportStatus('Thank you for the coffee! \u2615', 'success');
        btn.disabled = false;
        setTimeout(closeSupportModal, 2500);
      } else if (data.status === 'failed' || data.status === 'abandoned') {
        clearInterval(interval);
        showSupportStatus('Payment failed or was cancelled. Please try again.', 'error');
        btn.disabled = false;
      }
    } catch (err) {
      // keep polling
    }

    if (attempts >= 20) {
      clearInterval(interval);
      showSupportStatus('Still waiting for confirmation — check your phone or try again.', 'error');
      btn.disabled = false;
    }
  }, 3000);
}
