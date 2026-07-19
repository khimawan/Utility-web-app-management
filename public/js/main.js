document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
  const mainContent = document.querySelector('.main-content');

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  let autoHideTimer;
  const AUTO_HIDE_DELAY = 5000;

  // ensure sidebar starts hidden on mobile
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('show');
    document.body.classList.remove('sidebar-open');
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function lockBodyScroll(lock) {
    document.body.classList.toggle('sidebar-open', lock);
  }

  function showSidebar() {
    sidebar.classList.add('show');
    backdrop.classList.add('active');
    lockBodyScroll(true);
    scheduleAutoHide();
  }

  function hideSidebar() {
    sidebar.classList.remove('show');
    backdrop.classList.remove('active');
    lockBodyScroll(false);
    clearTimeout(autoHideTimer);
  }

  function toggleSidebar() {
    if (sidebar.classList.contains('show')) {
      hideSidebar();
    } else {
      showSidebar();
    }
  }

  function collapseSidebar() {
    sidebar.classList.add('collapsed');
    if (mainContent) mainContent.classList.add('expanded');
    document.querySelectorAll('.has-sub').forEach(function(el) {
      el.classList.remove('open');
    });
    clearTimeout(autoHideTimer);
  }

  function expandSidebar() {
    sidebar.classList.remove('collapsed');
    if (mainContent) mainContent.classList.remove('expanded');
    scheduleAutoHide();
  }

  function scheduleAutoHide() {
    clearTimeout(autoHideTimer);
    if (isMobile()) {
      if (sidebar.classList.contains('show')) {
        autoHideTimer = setTimeout(hideSidebar, AUTO_HIDE_DELAY);
      }
    } else {
      if (!sidebar.classList.contains('collapsed')) {
        autoHideTimer = setTimeout(collapseSidebar, AUTO_HIDE_DELAY);
      }
    }
  }

  // close sidebar on background scroll (mobile)
  if (mainContent) {
    mainContent.addEventListener('touchmove', function() {
      if (isMobile() && sidebar.classList.contains('show')) {
        hideSidebar();
      }
    }, { passive: true });
  }

  // close sidebar on window scroll (mobile)
  window.addEventListener('scroll', function() {
    if (isMobile() && sidebar.classList.contains('show')) {
      hideSidebar();
    }
  }, { passive: true });

  if (sidebar) {
    sidebar.addEventListener('mouseenter', function() {
      clearTimeout(autoHideTimer);
    });
    sidebar.addEventListener('mouseleave', scheduleAutoHide);
    sidebar.addEventListener('touchstart', function() {
      clearTimeout(autoHideTimer);
    }, { passive: true });
    sidebar.addEventListener('touchend', scheduleAutoHide, { passive: true });
    sidebar.addEventListener('click', function() {
      if (isMobile()) scheduleAutoHide();
    });
    backdrop.addEventListener('click', hideSidebar);
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      if (isMobile()) {
        hideSidebar();
      } else if (sidebar.classList.contains('collapsed')) {
        expandSidebar();
      } else {
        collapseSidebar();
      }
    });
  }

  if (sidebarToggleMobile) {
    sidebarToggleMobile.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  document.querySelectorAll('.sidebar-toggle').forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      var parent = this.closest('.has-sub');
      if (parent) {
        parent.classList.toggle('open');
        if (isMobile()) scheduleAutoHide();
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
