async function loadCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  try {
    const res = await fetch(`${API_BASE}/settings/voting-deadline`);
    const data = await res.json();

    if (!data.deadline) {
      el.style.display = 'none';
      return;
    }

    const deadline = new Date(data.deadline).getTime();
    el.style.display = 'flex';

    function tick() {
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        el.innerHTML = '<div class="countdown-ended">Voting has ended</div>';
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      el.innerHTML = `
        <div class="countdown-unit"><span>${days}</span><label>Days</label></div>
        <div class="countdown-unit"><span>${hours}</span><label>Hours</label></div>
        <div class="countdown-unit"><span>${minutes}</span><label>Minutes</label></div>
        <div class="countdown-unit"><span>${seconds}</span><label>Seconds</label></div>
      `;
    }

    tick();
    const timer = setInterval(tick, 1000);
  } catch (err) {
    el.style.display = 'none';
    console.error('Could not load voting deadline', err);
  }
}

loadCountdown();
