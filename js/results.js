async function loadResults() {
  const el = document.getElementById('results');
  try {
    const res = await fetch(`${API_BASE}/results`);
    const categories = await res.json();

    el.innerHTML = categories
      .map((cat) => {
        const sorted = [...cat.nominees].sort((a, b) => b.votes_count - a.votes_count);
        const rows = sorted
          .map(
            (n, i) => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
            <span>${i === 0 ? '\u{1F451} ' : ''}${n.full_name}</span>
            <strong style="color:var(--gold)">${n.votes_count || 0}</strong>
          </div>`
          )
          .join('');

        return `
        <div class="category-card" style="cursor:default;margin-bottom:20px;">
          <h3>${cat.name}</h3>
          ${rows || '<p style="color:var(--text-dim)">No nominees yet</p>'}
        </div>`;
      })
      .join('');
  } catch (err) {
    el.innerHTML = '<p style="color:var(--red)">Could not load results.</p>';
  }
}

loadResults();
setInterval(loadResults, 15000); // refresh every 15s for live feel
