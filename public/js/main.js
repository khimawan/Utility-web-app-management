document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
  const mainContent = document.querySelector('.main-content');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      if (mainContent) mainContent.classList.toggle('expanded');
    });
  }

  if (sidebarToggleMobile) {
    sidebarToggleMobile.addEventListener('click', function() {
      sidebar.classList.toggle('show');
    });
  }

  document.querySelectorAll('.edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      const modal = document.getElementById('editModal');
      if (modal) {
        const form = modal.querySelector('form');
        if (form) form.action = form.action.replace('/new', '/' + id);
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        e.preventDefault();
      }
    });
  });
});

function createLineChart(canvasId, labels, datasets, unit) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' }, title: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: unit || '' } },
        x: { title: { display: true, text: 'Tanggal' } }
      }
    }
  });
}

function createPieChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors || ['#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'] }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } }
    }
  });
}
