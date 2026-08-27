async function loadCategories() {
  const el = document.getElementById('categories');
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const categories = await res.json();

    if (!categories.length) {
      el.innerHTML = '<p style="color:var(--text-dim)">No categories yet — check back soon.</p>';
      return;
    }

    el.innerHTML =
      categories
        .map(
          (c) => `
      <div class="category-card" onclick="location.href='category.html?id=${c.id}&name=${encodeURIComponent(c.name)}'">
        <h3>${c.name}</h3>
        <p>Tap to view nominees and vote</p>
      </div>
    `
        )
        .join('') +
      `
      <div class="category-card" style="border-color:var(--gold);" onclick="openApplyModal()">
        <h3>Apply as a Nominee</h3>
        <p>Tap to submit your application</p>
      </div>
    `;
  } catch (err) {
    el.innerHTML = '<p style="color:var(--red)">Could not load categories. Please refresh.</p>';
    console.error(err);
  }
}

loadCategories();
