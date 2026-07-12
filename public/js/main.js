document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
  const mainContent = document.querySelector('.main-content');

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function toggleSidebar(show) {
    if (show === undefined) {
      sidebar.classList.toggle('show');
    } else if (show) {
      sidebar.classList.add('show');
    } else {
      sidebar.classList.remove('show');
    }
    backdrop.classList.toggle('active', sidebar.classList.contains('show'));
  }

  function collapseSidebar() {
    sidebar.classList.add('collapsed');
    if (mainContent) mainContent.classList.add('expanded');
    document.querySelectorAll('.has-sub').forEach(function(el) {
      el.classList.remove('open');
    });
  }

  let autoHideTimer;
  const AUTO_HIDE_DELAY = 2000;

  function cancelAutoHide() {
    clearTimeout(autoHideTimer);
  }

  function resumeAutoHideTimer() {
    cancelAutoHide();
    if (isMobile()) {
      if (sidebar.classList.contains('show')) {
        autoHideTimer = setTimeout(function() {
          toggleSidebar(false);
        }, AUTO_HIDE_DELAY);
      }
    } else {
      if (!sidebar.classList.contains('collapsed')) {
        autoHideTimer = setTimeout(function() {
          collapseSidebar();
        }, AUTO_HIDE_DELAY);
      }
    }
  }

  if (sidebar) {
    sidebar.addEventListener('mouseenter', cancelAutoHide);
    sidebar.addEventListener('mouseleave', resumeAutoHideTimer);
    sidebar.addEventListener('touchstart', cancelAutoHide, { passive: true });
    sidebar.addEventListener('touchend', resumeAutoHideTimer, { passive: true });

    backdrop.addEventListener('click', function() {
      toggleSidebar(false);
    });
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      const wasCollapsed = sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed');
      if (mainContent) mainContent.classList.toggle('expanded');
      if (sidebar.classList.contains('collapsed')) {
        document.querySelectorAll('.has-sub').forEach(function(el) {
          el.classList.remove('open');
        });
        cancelAutoHide();
      } else if (wasCollapsed) {
        resumeAutoHideTimer();
      }
    });
  }

  if (sidebarToggleMobile) {
    sidebarToggleMobile.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleSidebar();
      if (sidebar.classList.contains('show')) {
        resumeAutoHideTimer();
      } else {
        cancelAutoHide();
      }
    });
  }

  document.querySelectorAll('.sidebar-toggle').forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      var parent = this.closest('.has-sub');
      if (parent) {
        parent.classList.toggle('open');
      }
    });
  });

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
