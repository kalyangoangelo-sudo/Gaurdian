/**
 * portal.js — GuardianLink Professional Portal logic
 *
 * Caseworker authentication, case queue, case detail management,
 * response templates, referral, and audit trail.
 */
(function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────
  const BASE = ''; // Same-origin when served from Express

  // ─── State ──────────────────────────────────────────────────────
  let token = localStorage.getItem('gl_portal_token') || null;
  let currentUser = localStorage.getItem('gl_portal_user') || null;
  let userRole = localStorage.getItem('gl_portal_role') || null;
  let cases = [];
  let selectedCaseId = null;
  let currentActionPanel = null;

  // Pre-approved response templates (not AI-generated)
  const RESPONSE_TEMPLATES = [
    {
      id: 'received',
      title: 'Report received — acknowledgment',
      body: 'Thank you for reporting this. We have received your report and a trained person is reviewing it. You are not alone. Please check back here for updates using your case reference and recovery code.',
    },
    {
      id: 'reviewing',
      title: 'Under review — information request',
      body: 'Your report is being reviewed by a safeguarding professional. We may need to share limited information with the appropriate authorities to keep you safe. If you are in immediate danger, please call 116 (Child Helpline) or 999 (Police).',
    },
    {
      id: 'referred',
      title: 'Referred — external support',
      body: 'Your report has been referred to an appropriate child protection service. A professional will follow up. If you need urgent help, call 116 or 999.',
    },
    {
      id: 'resolved',
      title: 'Resolved — case closed',
      body: 'Your case has been reviewed and appropriate action has been taken. If you experience anything similar in the future, please submit a new report. You are not alone — help is always available.',
    },
    {
      id: 'safety_tips',
      title: 'Safety guidance — general',
      body: 'Here are steps you can take: 1) Tell a trusted adult. 2) Do not reply to the person. 3) Save any messages. 4) Block the person if possible. 5) Call 116 (Child Helpline) for support. You did the right thing by reporting.',
    },
  ];

  // ─── API helpers ────────────────────────────────────────────────
  async function apiCall(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      // Token expired
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ─── Login ──────────────────────────────────────────────────────
  function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');
  }

  async function login() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const role = document.getElementById('loginRole').value;
    const errEl = document.getElementById('loginError');

    if (!username || !password) {
      errEl.textContent = 'Please enter username and password.';
      errEl.style.display = 'block';
      return;
    }

    try {
      let res;
      if (role === 'caseworker') {
        res = await fetch(BASE + '/auth/caseworker/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
      } else {
        // Teacher login uses the general /login endpoint
        res = await fetch(BASE + '/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      token = data.token;
      currentUser = username;
      userRole = data.role || role;
      localStorage.setItem('gl_portal_token', token);
      localStorage.setItem('gl_portal_user', currentUser);
      localStorage.setItem('gl_portal_role', userRole);

      document.getElementById('userBadge').textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1) + ': ' + username;

      // Show/hide tabs based on role
      const nav = document.getElementById('portalNav');
      if (userRole === 'teacher') {
        // Teachers see lessons only
        nav.querySelectorAll('.nav-tab').forEach(t => {
          t.style.display = t.dataset.tab === 'lessons' ? '' : 'none';
        });
        document.getElementById('teacherPanel').style.display = 'block';
        switchTab('lessons');
        loadLessons();
        loadAssignments();
      } else {
        // Caseworkers see all tabs
        nav.querySelectorAll('.nav-tab').forEach(t => t.style.display = '');
        document.getElementById('teacherPanel').style.display = 'none';
        switchTab('cases');
        loadCases();
      }

      showView('dashboard');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  }

  function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('gl_portal_token');
    localStorage.removeItem('gl_portal_user');
    showView('login');
  }

  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('loginPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('refreshBtn').addEventListener('click', loadCases);
  document.getElementById('closeDetailBtn').addEventListener('click', () => {
    document.getElementById('caseDetailPanel').style.display = 'none';
    currentActionPanel = null;
  });

  // ─── Case Queue ─────────────────────────────────────────────────
  async function loadCases() {
    const listEl = document.getElementById('caseList');
    listEl.innerHTML = '<div class="loading">Loading cases…</div>';

    try {
      cases = await apiCall('GET', '/cases');
      renderCaseList();
    } catch (err) {
      listEl.innerHTML = '<div class="empty">Failed to load cases: ' + escapeHtml(err.message) + '</div>';
    }
  }

  function renderCaseList() {
    const listEl = document.getElementById('caseList');
    const priorityFilter = document.getElementById('filterPriority').value;
    const statusFilter = document.getElementById('filterStatus').value;

    let filtered = cases;
    if (priorityFilter) {
      filtered = filtered.filter(c => (c.humanPriority || c.priority) === priorityFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Sort by effective priority then date
    const priorityOrder = { CRITICAL: 0, HIGH: 1, STANDARD: 2 };
    filtered.sort((a, b) => {
      const pa = priorityOrder[a.humanPriority || a.priority] ?? 3;
      const pb = priorityOrder[b.humanPriority || b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty">No cases match the current filters.</div>';
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const effPriority = c.humanPriority || c.priority;
      const isSelected = c.id === selectedCaseId;
      return `
        <div class="case-card ${isSelected ? 'selected' : ''}" data-id="${c.id}">
          <div class="case-card-row1">
            <span class="case-ref">${escapeHtml(c.caseRef)}</span>
            <div>
              <span class="priority-badge priority-${effPriority}">${effPriority}</span>
              ${c.humanPriority ? '<span class="ai-flag"> ↺ overridden</span>' : ''}
            </div>
          </div>
          <div class="case-card-row1">
            <span class="case-category">${escapeHtml(c.category)}</span>
            <span class="status-badge status-${c.status.replace(/\s/g, '')}">${escapeHtml(c.status)}</span>
          </div>
          <div class="case-card-row2">
            <span class="case-date">${formatDate(c.createdAt)}</span>
            ${c.aiResult?.requiresHumanReview ? '<span class="ai-flag">⚠ AI review flag</span>' : ''}
            ${c.anonymous ? '<span class="ai-flag">Anonymous</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    listEl.querySelectorAll('.case-card').forEach(card => {
      card.addEventListener('click', () => openCaseDetail(card.dataset.id));
    });
  }

  document.getElementById('filterPriority').addEventListener('change', renderCaseList);
  document.getElementById('filterStatus').addEventListener('change', renderCaseList);

  // ─── Case Detail ─────────────────────────────────────────────────
  async function openCaseDetail(caseId) {
    selectedCaseId = caseId;
    document.querySelectorAll('.case-card').forEach(c => c.classList.toggle('selected', c.dataset.id === caseId));

    const detailPanel = document.getElementById('caseDetailPanel');
    const content = document.getElementById('caseDetailContent');
    detailPanel.style.display = 'block';
    content.innerHTML = '<div class="loading">Loading case detail…</div>';

    try {
      const c = await apiCall('GET', '/cases/' + caseId);
      renderCaseDetail(c);
    } catch (err) {
      content.innerHTML = '<div class="empty">Failed to load case: ' + escapeHtml(err.message) + '</div>';
    }
  }

  function renderCaseDetail(c) {
    const effPriority = c.humanPriority || c.priority;
    const detail = c.description || '';

    content = document.getElementById('caseDetailContent');
    content.innerHTML = `
      <h2 class="detail-title">Case ${escapeHtml(c.caseRef)}</h2>
      <div class="detail-meta">
        <span>Category: <strong>${escapeHtml(c.category)}</strong></span>
        <span>Status: <strong>${escapeHtml(c.status)}</strong></span>
        <span>Priority: <span class="priority-badge priority-${effPriority}">${effPriority}</span></span>
        ${c.humanPriority ? '<span style="color:var(--gray)">AI: ' + (c.aiResult?.suggestedPriority || '—') + ' → Human: ' + c.humanPriority + '</span>' : ''}
        ${c.anonymous ? '<span>Anonymous</span>' : ''}
      </div>
      <div class="detail-meta">
        <span>Submitted by: ${escapeHtml(c.submittedByRole || 'anonymous')}</span>
        <span>Created: ${formatDate(c.createdAt)}</span>
        <span>Updated: ${formatDate(c.updatedAt)}</span>
      </div>

      <!-- AI Assessment -->
      ${c.aiResult ? `
        <div class="detail-section">
          <h3>AI Assessment</h3>
          <div class="ai-assessment">
            <div class="ai-row"><span class="ai-label">Suggested Priority</span><span class="ai-value">${escapeHtml(c.aiResult.suggestedPriority || '—')}</span></div>
            <div class="ai-row"><span class="ai-label">Requires Human Review</span><span class="ai-value">${c.aiResult.requiresHumanReview ? 'Yes ⚠' : 'No'}</span></div>
            ${c.aiResult.indicators?.length ? '<div class="ai-row"><span class="ai-label">Indicators</span><span class="ai-value">' + c.aiResult.indicators.map(escapeHtml).join(', ') + '</span></div>' : ''}
            ${c.aiResult.confidence ? '<div class="ai-row"><span class="ai-label">Confidence</span><span class="ai-value">' + Math.round(c.aiResult.confidence * 100) + '%</span></div>' : ''}
          </div>
        </div>` : ''}

      <!-- Report Content (PII tokenized) -->
      <div class="detail-section">
        <h3>Report Content <span style="font-weight:400;font-size:11px;color:var(--gray)">(PII tokenized)</span></h3>
        <p class="detail-text">${escapeHtml(detail) || '<span class="redacted">No description provided</span>'}</p>
        ${c.encryptedTokenMap ? '<p class="redacted" style="margin-top:8px">🔒 Personally identifiable information has been tokenized and encrypted.</p>' : ''}
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <button class="btn-action" data-action="assess">Set Priority</button>
        <button class="btn-action" data-action="status">Change Status</button>
        <button class="btn-action" data-action="note">Add Note</button>
        <button class="btn-action" data-action="refer">Refer Case</button>
        <button class="btn-action" data-action="respond">Send Response</button>
        <button class="btn-action" data-action="audit">View Audit Trail</button>
      </div>

      <!-- Dynamic Action Panel -->
      <div id="actionPanelContainer"></div>

      <!-- Notes -->
      ${c.notes && c.notes.length > 0 ? `
        <div class="detail-section">
          <h3>Internal Notes (${c.notes.length})</h3>
          ${c.notes.map(n => `<div class="note-entry"><div class="note-text">${escapeHtml(n.text)}</div><div class="note-meta">By: ${escapeHtml(n.by)} — ${formatDate(n.at)}</div></div>`).join('')}
        </div>` : ''}

      <!-- Referrals -->
      ${c.referrals && c.referrals.length > 0 ? `
        <div class="detail-section">
          <h3>Referrals (${c.referrals.length})</h3>
          ${c.referrals.map(r => `<div class="referral-card"><div><strong>${escapeHtml(r.service)}</strong> — ${escapeHtml(r.referralId)}</div><div class="referral-simulated">⚠️ SIMULATED — This referral was not actually sent to an external agency.</div><div style="font-size:12px;color:var(--gray);margin-top:4px">${escapeHtml(r.acknowledgment || '')}</div></div>`).join('')}
        </div>` : ''}
    `;

    // Attach action handlers
    content.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', () => showActionPanel(btn.dataset.action, c));
    });
  }

  // ─── Action Panels ───────────────────────────────────────────────
  function showActionPanel(action, caseObj) {
    // Deactivate previous
    content.querySelectorAll('.btn-action').forEach(b => b.classList.remove('active'));
    content.querySelector(`[data-action="${action}"]`).classList.add('active');

    const container = document.getElementById('actionPanelContainer');

    if (action === 'assess') {
      container.innerHTML = `
        <div class="action-panel">
          <label>Set human priority override</label>
          <select id="assessPriority">
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="STANDARD">STANDARD</option>
          </select>
          <button class="btn-primary" id="assessSubmit">Set Priority</button>
        </div>`;
      document.getElementById('assessSubmit').addEventListener('click', async () => {
        const priority = document.getElementById('assessPriority').value;
        await apiCall('PUT', '/cases/' + caseObj.id + '/assess', { humanPriority: priority });
        openCaseDetail(caseObj.id);
        loadCases();
      });
    }
    else if (action === 'status') {
      const statuses = ['Submitted','Awaiting Assessment','Under Review','Action Required','Referred','Follow-up Pending','Resolved','Closed'];
      container.innerHTML = `
        <div class="action-panel">
          <label>Change case status</label>
          <select id="statusSelect">${statuses.map(s => `<option value="${s}" ${s === caseObj.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <button class="btn-primary" id="statusSubmit">Update Status</button>
        </div>`;
      document.getElementById('statusSubmit').addEventListener('click', async () => {
        const status = document.getElementById('statusSelect').value;
        await apiCall('PUT', '/cases/' + caseObj.id + '/status', { status });
        openCaseDetail(caseObj.id);
        loadCases();
      });
    }
    else if (action === 'note') {
      container.innerHTML = `
        <div class="action-panel">
          <label>Internal note (caseworkers only — not visible to child)</label>
          <textarea id="noteText" rows="4" placeholder="Enter internal note…"></textarea>
          <button class="btn-primary" id="noteSubmit">Add Note</button>
        </div>`;
      document.getElementById('noteSubmit').addEventListener('click', async () => {
        const note = document.getElementById('noteText').value.trim();
        if (!note) return;
        await apiCall('PUT', '/cases/' + caseObj.id + '/note', { note });
        openCaseDetail(caseObj.id);
      });
    }
    else if (action === 'refer') {
      container.innerHTML = `
        <div class="action-panel">
          <label>Select referral service</label>
          <select id="referService">
            <option value="">Auto-assign</option>
            <option value="Childline Uganda 116">Childline Uganda 116 (SIMULATED)</option>
            <option value="Uganda Police Child Protection Unit">Uganda Police CPU (SIMULATED)</option>
            <option value="UNICEF Uganda">UNICEF Uganda (SIMULATED)</option>
            <option value="Save the Children Uganda">Save the Children Uganda (SIMULATED)</option>
            <option value="Ministry of Gender Uganda">Ministry of Gender Uganda (SIMULATED)</option>
          </select>
          <p style="font-size:12px;color:var(--amber);margin-bottom:12px">⚠️ SIMULATED — No real agency is contacted. WireMock stub returns an acknowledgment.</p>
          <button class="btn-primary" id="referSubmit">Refer Case</button>
        </div>`;
      document.getElementById('referSubmit').addEventListener('click', async () => {
        const service = document.getElementById('referService').value || undefined;
        await apiCall('POST', '/cases/' + caseObj.id + '/refer', service ? { service } : {});
        openCaseDetail(caseObj.id);
        loadCases();
      });
    }
    else if (action === 'respond') {
      container.innerHTML = `
        <div class="action-panel">
          <label>Select a pre-approved response template</label>
          ${RESPONSE_TEMPLATES.map(t => `
            <div class="response-template" data-template="${t.id}">
              <div class="response-template-title">${escapeHtml(t.title)}</div>
              <div class="response-template-body">${escapeHtml(t.body)}</div>
            </div>`).join('')}
          <button class="btn-primary" id="responseSubmit" disabled style="margin-top:12px">Send Response to Child</button>
        </div>`;

      let selectedTemplate = null;
      container.querySelectorAll('.response-template').forEach(el => {
        el.addEventListener('click', () => {
          container.querySelectorAll('.response-template').forEach(t => t.classList.remove('selected'));
          el.classList.add('selected');
          selectedTemplate = el.dataset.template;
          document.getElementById('responseSubmit').disabled = false;
        });
      });

      document.getElementById('responseSubmit').addEventListener('click', async () => {
        if (!selectedTemplate) return;
        const template = RESPONSE_TEMPLATES.find(t => t.id === selectedTemplate);
        await apiCall('PUT', '/cases/' + caseObj.id + '/response', { response: template.body, responseTemplate: template.id });
        openCaseDetail(caseObj.id);
      });
    }
    else if (action === 'audit') {
      try {
        const audit = await apiCall('GET', '/cases/' + caseObj.id + '/audit');
        container.innerHTML = `
          <div class="detail-section">
            <h3>Audit Trail (${audit.length} entries)</h3>
            ${audit.map(a => `<div class="audit-entry"><span class="audit-action">${escapeHtml(a.action)}</span> <span class="audit-meta">by ${escapeHtml(a.by || 'system')}</span> ${a.status ? '<span class="audit-meta">→ ' + escapeHtml(a.status) + '</span>' : ''} ${a.humanPriority ? '<span class="audit-meta">→ ' + escapeHtml(a.humanPriority) + '</span>' : ''} ${a.service ? '<span class="audit-meta">→ ' + escapeHtml(a.service) + '</span>' : ''}<div class="audit-time">${formatDate(a.at)}</div></div>`).join('')}
          </div>`;
      } catch (err) {
        container.innerHTML = '<div class="empty">Failed to load audit trail.</div>';
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch { return iso; }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  // ─── Tab Navigation ─────────────────────────────────────────────
  function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName)?.classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  }

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
      if (tabName === 'curiosity') loadCuriosity();
      if (tabName === 'lessons') loadLessons();
      if (tabName === 'subscriptions') loadSubscriptions();
    });
  });

  // ─── Curiosity Corner ──────────────────────────────────────────
  async function loadCuriosity() {
    const listEl = document.getElementById('curiosityList');
    listEl.innerHTML = '<div class="loading">Loading questions…</div>';

    try {
      const data = await apiCall('GET', '/curiosity/pending');
      if (data.length === 0) {
        listEl.innerHTML = '<div class="empty">No pending questions.</div>';
        return;
      }
      listEl.innerHTML = data.map(q => `
        <div class="curiosity-card ${q.isSeriousFlag ? 'flagged' : ''}">
          <div class="q-text">${escapeHtml(q.question)}</div>
          <div class="q-meta">Ref: ${escapeHtml(q.questionRef)} — Category: ${escapeHtml(q.category)} — ${q.isSeriousFlag ? '⚠ FLAGGED' : 'Pending'} — ${formatDate(q.createdAt)}</div>
          ${q.aiAssessment?.indicators?.length ? '<div class="q-meta">AI: ' + escapeHtml(q.aiAssessment.indicators.join(', ')) + '</div>' : ''}
          <div class="q-actions">
            <button class="btn-action" data-curiosity-action="respond" data-id="${q.id}">Respond</button>
            <button class="btn-action" data-curiosity-action="categorize" data-id="${q.id}">Categorize</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('[data-curiosity-action]').forEach(btn => {
        btn.addEventListener('click', () => handleCuriosityAction(btn.dataset.curiosityAction, btn.dataset.id));
      });
    } catch (err) {
      listEl.innerHTML = '<div class="empty">Failed to load: ' + escapeHtml(err.message) + '</div>';
    }
  }

  async function handleCuriosityAction(action, id) {
    if (action === 'respond') {
      const template = prompt('Enter response text (or template key: bullying, privacy, friends, boundaries, help, general):');
      if (!template) return;

      let body = {};
      if (['bullying', 'privacy', 'friends', 'boundaries', 'help', 'general'].includes(template)) {
        body.templateKey = template;
      } else {
        body.response = template;
      }

      try {
        await apiCall('PUT', '/curiosity/' + id + '/respond', body);
        loadCuriosity();
      } catch (err) {
        alert('Failed: ' + err.message);
      }
    } else if (action === 'categorize') {
      const category = prompt('Enter category (bullying, privacy, friends, boundaries, help, general):');
      if (!category) return;
      try {
        await apiCall('PUT', '/curiosity/' + id + '/categorize', { category });
        loadCuriosity();
      } catch (err) {
        alert('Failed: ' + err.message);
      }
    }
  }

  document.getElementById('refreshCuriosityBtn')?.addEventListener('click', loadCuriosity);

  // ─── Lessons ────────────────────────────────────────────────────
  let loadedLessons = [];
  async function loadLessons() {
    const listEl = document.getElementById('lessonsList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="loading">Loading lessons…</div>';

    try {
      loadedLessons = await apiCall('GET', '/lessons');
      listEl.innerHTML = loadedLessons.map(l => `
        <div class="lesson-item">
          <h4>${escapeHtml(l.title)}</h4>
          <p>${escapeHtml(l.description)}</p>
          <span style="font-size:12px;color:var(--gray);">Age: ${escapeHtml(l.ageBand)} | ${l.hasQuiz ? 'Has quiz' : 'No quiz'}</span>
        </div>
      `).join('');

      // Populate assignment dropdown for teachers
      const assignSelect = document.getElementById('assignLessonId');
      if (assignSelect) {
        assignSelect.innerHTML = '<option value="">Select lesson…</option>' +
          loadedLessons.map(l => `<option value="${l.id}">${escapeHtml(l.title)}</option>`).join('');
      }
    } catch (err) {
      listEl.innerHTML = '<div class="empty">Failed to load lessons.</div>';
    }
  }

  document.getElementById('refreshLessonsBtn')?.addEventListener('click', loadLessons);

  // ─── Teacher Assignment ─────────────────────────────────────────
  document.getElementById('assignBtn')?.addEventListener('click', async () => {
    const lessonId = document.getElementById('assignLessonId').value;
    const classId = document.getElementById('assignClassId').value;
    if (!lessonId) return alert('Please select a lesson.');

    try {
      await apiCall('POST', '/lessons/assign', { lessonId, classId: classId || undefined });
      alert('Lesson assigned successfully.');
      loadAssignments();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  });

  async function loadAssignments() {
    const listEl = document.getElementById('assignmentList');
    if (!listEl || userRole !== 'teacher') return;

    try {
      // Decode JWT payload to get teacher ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const data = await apiCall('GET', '/lessons/assignments/' + payload.id);
      listEl.innerHTML = data.length === 0
        ? '<p style="font-size:13px;color:var(--gray);">No assignments yet.</p>'
        : data.map(a => `<div class="lesson-item"><h4>${escapeHtml(a.lessonTitle)}</h4><span style="font-size:12px;color:var(--gray);">Class: ${escapeHtml(a.classId || 'all')} — Assigned: ${formatDate(a.assignedAt)}</span></div>`).join('');
    } catch (err) {
      listEl.innerHTML = '<p style="font-size:13px;color:var(--red);">Failed to load assignments.</p>';
    }
  });

  // ─── Subscriptions ──────────────────────────────────────────────
  let registeredOrgs = [];
  async function loadSubscriptions() {
    const listEl = document.getElementById('orgList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="loading">Loading organizations…</div>';

    try {
      // No direct "list orgs" endpoint — show message if none registered in this session
      listEl.innerHTML = '<p style="font-size:13px;color:var(--gray);">Register an organization above to manage its subscription.</p>';
    } catch (err) {
      listEl.innerHTML = '<div class="empty">Failed to load.</div>';
    }
  }

  document.getElementById('registerOrgBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('orgName').value.trim();
    const type = document.getElementById('orgType').value;
    const plan = document.getElementById('orgPlan').value;
    const contactEmail = document.getElementById('orgEmail').value.trim();

    if (!name) return alert('Organization name is required.');

    try {
      const res = await fetch(BASE + '/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, plan, contactEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // Create subscription
      await fetch(BASE + '/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: data.id, plan }),
      });

      registeredOrgs.push(data);
      renderOrgs();
      document.getElementById('orgName').value = '';
      document.getElementById('orgEmail').value = '';
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  });

  function renderOrgs() {
    const listEl = document.getElementById('orgList');
    if (!listEl) return;

    if (registeredOrgs.length === 0) {
      listEl.innerHTML = '<p style="font-size:13px;color:var(--gray);">No organizations registered.</p>';
      return;
    }

    listEl.innerHTML = registeredOrgs.map(org => `
      <div class="org-card">
        <div>
          <div class="org-name">${escapeHtml(org.name)}</div>
          <div class="org-plan">${escapeHtml(org.plan)} — ${escapeHtml(org.type)} — ${escapeHtml(org.status)}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <select id="plan-change-${org.id}" style="width:auto;padding:4px;font-size:12px;">
            <option value="">Change plan…</option>
            <option value="free">Free</option>
            <option value="family">Family Premium</option>
            <option value="school-starter">School Starter</option>
            <option value="institutional">Institutional</option>
          </select>
          <button class="btn-action" data-org-id="${org.id}" data-org-action="change-plan">Apply</button>
          <button class="btn-action" data-org-id="${org.id}" data-org-action="billing">Billing</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-org-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const orgId = btn.dataset.orgId;
        const action = btn.dataset.orgAction;

        if (action === 'change-plan') {
          const newPlan = document.getElementById('plan-change-' + orgId).value;
          if (!newPlan) return;
          try {
            await apiCall('PUT', '/subscriptions/' + orgId + '/plan', { plan: newPlan });
            alert('Plan changed to ' + newPlan);
          } catch (err) {
            alert('Failed: ' + err.message);
          }
        } else if (action === 'billing') {
          try {
            const subInfo = await (await fetch(BASE + '/subscriptions/' + orgId)).json();
            if (subInfo.price === 0) return alert('No billing required for free plan.');
            const billing = await apiCall('POST', '/subscriptions/' + orgId + '/billing', {});
            alert('SIMULATED billing record created: ' + billing.reference + '\nAmount: ' + billing.amount + ' ' + billing.currency);
          } catch (err) {
            alert('Failed: ' + err.message);
          }
        }
      });
    });
  }
    document.getElementById('userBadge').textContent = (userRole || 'User').charAt(0).toUpperCase() + (userRole || 'User').slice(1) + ': ' + (currentUser || '');
    showView('dashboard');
    if (userRole === 'teacher') {
      document.getElementById('portalNav').querySelectorAll('.nav-tab').forEach(t => {
        t.style.display = t.dataset.tab === 'lessons' ? '' : 'none';
      });
      document.getElementById('teacherPanel').style.display = 'block';
      switchTab('lessons');
      loadLessons();
      loadAssignments();
    } else {
      switchTab('cases');
      loadCases();
    }
  } else {
    showView('login');
  }
})();
