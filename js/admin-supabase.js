/* ============================================
   AdminPanel - Supabase-powered Admin Dashboard
   ============================================ */

var AdminPanel = (function() {

  // Load admin stats and user list into the given container
  async function loadStats(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    // 1. Check session
    var sessionRes = await SupabaseClient.auth.getSession();
    if (!sessionRes.data.session) {
      container.innerHTML =
        '<div class="callout callout--tip" style="text-align:center; margin-top:2rem;">' +
          '<p style="font-size:1.1rem;">Not authenticated.</p>' +
          '<a href="login.html" class="btn-primary" style="margin-top:1rem; display:inline-block;">Log in</a>' +
        '</div>';
      return;
    }

    // 2. Fetch aggregate stats via RPC
    var statsRes = await SupabaseClient.rpc('get_admin_stats');
    if (statsRes.error) {
      container.innerHTML =
        '<div class="callout callout--tip" style="text-align:center; margin-top:2rem;">' +
          '<p style="font-size:1.1rem; color:#ff6b6b;">Access denied. Admin privileges required.</p>' +
        '</div>';
      return;
    }

    var stats = statsRes.data;

    // 3. Build stat cards
    var statCards = [
      { key: 'total_users',          label: 'Total Users' },
      { key: 'quiz_attempts',        label: 'Quiz Attempts' },
      { key: 'quiz_passes',          label: 'Quiz Passes' },
      { key: 'unique_quiz_passers',  label: 'Unique Quiz Passers' },
      { key: 'gallery_submissions',  label: 'Gallery Submissions' },
      { key: 'active_learners',      label: 'Active Learners' }
    ];

    var html = '<div class="admin-stats-grid">';
    for (var i = 0; i < statCards.length; i++) {
      var card = statCards[i];
      var value = stats[card.key] !== undefined ? stats[card.key] : 0;
      html += '<div class="admin-stat">';
      html += '<div class="admin-stat__number">' + value + '</div>';
      html += '<div class="admin-stat__label">' + card.label + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // Export button
    html += '<div style="margin:1.5rem 0;">';
    html += '<button class="btn-primary" id="exportCSVBtn">Export Users CSV</button>';
    html += '</div>';

    // 4. Fetch user list
    var usersRes = await SupabaseClient.from('profiles')
      .select('email, registered_at')
      .order('registered_at', { ascending: false });

    if (usersRes.data && usersRes.data.length > 0) {
      html += '<table class="admin-table">';
      html += '<thead><tr><th>#</th><th>Email</th><th>Registered At</th></tr></thead>';
      html += '<tbody>';
      for (var j = 0; j < usersRes.data.length; j++) {
        var user = usersRes.data[j];
        var d = new Date(user.registered_at);
        html += '<tr>';
        html += '<td>' + (j + 1) + '</td>';
        html += '<td>' + escapeHtml(user.email) + '</td>';
        html += '<td>' + d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table>';
    } else {
      html += '<p class="text-muted text-center">No registered users found.</p>';
    }

    container.innerHTML = html;

    // Bind export button
    var exportBtn = document.getElementById('exportCSVBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        exportCSV();
      });
    }
  }

  // Export profiles to CSV and trigger download
  async function exportCSV() {
    var usersRes = await SupabaseClient.from('profiles')
      .select('email, registered_at')
      .order('registered_at', { ascending: false });

    if (usersRes.error || !usersRes.data) {
      alert('Failed to fetch user data for export.');
      return;
    }

    var lines = ['Email,Registered At'];
    for (var i = 0; i < usersRes.data.length; i++) {
      var row = usersRes.data[i];
      lines.push(row.email + ',' + row.registered_at);
    }

    var csv = lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ai-mastery-users-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Simple HTML escape to prevent XSS in rendered email addresses
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  return {
    loadStats: loadStats,
    exportCSV: exportCSV
  };

})();
