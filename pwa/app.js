/**
 * app.js — GuardianLink PWA main application logic
 *
 * Handles view routing, language switching, report submission,
 * case status checking, Curiosity Corner, and lesson display.
 */
(function () {
  'use strict';

  const t = window.GuardianI18n.t;
  const api = window.GuardianAPI;

  let selectedCategory = null;

  // ─── View Routing ──────────────────────────────────────────────
  function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + viewName);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }
  }

  // Attach click handlers to all data-view elements
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-view]');
    if (el) {
      const view = el.dataset.view;
      if (view === 'report') {
        // Reset report form when entering
        resetReportForm();
      }
      showView(view);
    }
  });

  // Header brand click → home
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('header-brand')) {
      showView('home');
    }
  });

  // ─── Language ──────────────────────────────────────────────────
  function applyTranslations() {
    const lang = window.GuardianI18n.getCurrentLang();

    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (val && val !== key) el.textContent = val;
    });

    // Update all data-i18n-placeholder elements
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const val = t(key);
      if (val && val !== key) el.placeholder = val;
    });

    // Update html lang attribute
    document.documentElement.lang = lang;
  }

  document.getElementById('langToggle').addEventListener('click', () => {
    window.GuardianI18n.setLang(window.GuardianI18n.getCurrentLang());
    applyTranslations();
  });

  // ─── Report Form ───────────────────────────────────────────────
  function resetReportForm() {
    selectedCategory = null;
    document.querySelectorAll('.pic-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('selectedCategory').style.display = 'none';
    document.getElementById('reportText').value = '';
    document.getElementById('pastedText').value = '';
    document.querySelector('input[name="safeContact"][value="true"]').checked = true;
    document.getElementById('submitReportBtn').disabled = true;
    document.getElementById('reportError').style.display = 'none';
  }

  // Picture category selection
  document.querySelectorAll('.pic-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.pic-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCategory = card.dataset.category;

      // Show selected indicator
      const indicator = document.getElementById('selectedCategory');
      const labelEl = card.querySelector('.pic-label');
      indicator.textContent = '✓ ' + (labelEl ? labelEl.textContent : selectedCategory);
      indicator.style.display = 'block';

      // Enable submit
      document.getElementById('submitReportBtn').disabled = false;
    });
  });

  // Also allow typing to enable submit (typed-only report without picture)
  document.getElementById('reportText').addEventListener('input', updateSubmitState);
  document.getElementById('pastedText').addEventListener('input', updateSubmitState);

  // ─── Voice Reporting (Web Speech API) ───────────────────────────
  // Push-to-talk: recording starts only after explicit button press.
  // Transcription is shown for editing before submission.
  // No raw audio is retained — the Web Speech API sends audio to the
  // browser's speech service and returns text only.
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    // Show the voice group — browser supports speech recognition
    document.getElementById('voiceGroup').style.display = 'block';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = window.GuardianI18n.getCurrentLang() === 'lg' ? 'lg-UG' : 'en-US';

    let isRecording = false;
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceTranscript = document.getElementById('voiceTranscript');

    function startRecording() {
      if (isRecording) return;
      isRecording = true;
      voiceBtn.classList.add('recording');
      voiceBtn.querySelector('.voice-icon').textContent = '⏹';
      voiceBtn.querySelector('span:last-child').textContent = 'Tap to stop';
      recognition.lang = window.GuardianI18n.getCurrentLang() === 'lg' ? 'lg-UG' : 'en-US';
      recognition.start();
    }

    function stopRecording() {
      if (!isRecording) return;
      isRecording = false;
      voiceBtn.classList.remove('recording');
      voiceBtn.querySelector('.voice-icon').textContent = '🎤';
      voiceBtn.querySelector('span:last-child').textContent = 'Hold to speak';
      recognition.stop();
    }

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      // Show transcript for confirmation and editing
      voiceTranscript.textContent = finalTranscript + interimTranscript;

      // Put final transcript into the report text field for editing
      if (finalTranscript) {
        const reportText = document.getElementById('reportText');
        reportText.value = (reportText.value + ' ' + finalTranscript).trim();
        updateSubmitState();
      }
    };

    recognition.onerror = (event) => {
      isRecording = false;
      voiceBtn.classList.remove('recording');
      voiceBtn.querySelector('.voice-icon').textContent = '🎤';
      voiceBtn.querySelector('span:last-child').textContent = 'Hold to speak';
      if (event.error === 'not-allowed') {
        voiceTranscript.textContent = 'Microphone permission denied. You can type your report instead.';
      } else if (event.error === 'no-speech') {
        voiceTranscript.textContent = 'No speech detected. Try again or type your report.';
      } else {
        voiceTranscript.textContent = 'Voice input error. You can type your report instead.';
      }
    };

    recognition.onend = () => {
      isRecording = false;
      voiceBtn.classList.remove('recording');
      voiceBtn.querySelector('.voice-icon').textContent = '🎤';
      voiceBtn.querySelector('span:last-child').textContent = 'Hold to speak';
    };

    voiceBtn.addEventListener('click', () => {
      if (isRecording) stopRecording();
      else startRecording();
    });
  }
  // If SpeechRecognition is not available, the voice group stays hidden
  // and the child can always use typed or picture-based reporting.

  function updateSubmitState() {
    const hasCategory = !!selectedCategory;
    const hasText = document.getElementById('reportText').value.trim() ||
                    document.getElementById('pastedText').value.trim();
    document.getElementById('submitReportBtn').disabled = !(hasCategory || hasText);
  }

  // Submit report
  document.getElementById('submitReportBtn').addEventListener('click', async () => {
    const btn = document.getElementById('submitReportBtn');
    const errEl = document.getElementById('reportError');
    errEl.style.display = 'none';

    const safeContact = document.querySelector('input[name="safeContact"]:checked').value === 'true';

    // XSS-safe: escape text before sending (server also validates)
    const description = sanitizeInput(document.getElementById('reportText').value);
    const pastedText = sanitizeInput(document.getElementById('pastedText').value);

    // Require at least a category or text
    if (!selectedCategory && !description && !pastedText) {
      errEl.textContent = 'Please choose a picture or type something.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = t('sending');

    try {
      const result = await api.submitReport({
        pictureCategory: selectedCategory || 'other',
        description,
        pastedText,
        safeToContact: safeContact,
      });

      // Show success modal
      showSuccessModal(result.caseRef, result.recoverySecret);
      resetReportForm();
    } catch (err) {
      errEl.textContent = err.message || 'Failed to submit report. Please try again.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = t('submit_report');
    }
  });

  // ─── XSS-safe input sanitization ────────────────────────────────
  function sanitizeInput(text) {
    if (!text) return '';
    // Remove script tags and event handlers
    return text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  // ─── Success Modal ──────────────────────────────────────────────
  function showSuccessModal(caseRef, recoverySecret) {
    document.getElementById('modalCaseRef').textContent = caseRef;
    document.getElementById('modalRecoverySecret').textContent = recoverySecret;
    document.getElementById('successModal').style.display = 'flex';
  }

  // Close modal
  document.querySelector('.modal-done-btn').addEventListener('click', () => {
    document.getElementById('successModal').style.display = 'none';
    showView('home');
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copy;
      const text = document.getElementById(targetId).textContent;
      navigator.clipboard.writeText(text).then(() => {
        const original = btn.textContent;
        btn.textContent = t('copied');
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        // Fallback for non-clipboard environments
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        btn.textContent = t('copied');
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = btn.dataset.i18n === 'copy_secret' ? t('copy_secret') : t('copy_case_ref'); btn.classList.remove('copied'); }, 2000);
      });
    });
  });

  // ─── Case Status ───────────────────────────────────────────────
  document.getElementById('checkStatusBtn').addEventListener('click', async () => {
    const caseRef = document.getElementById('caseRefInput').value.trim().toUpperCase();
    const recoverySecret = document.getElementById('recoveryInput').value.trim();
    const errEl = document.getElementById('statusError');
    const resultEl = document.getElementById('statusResult');

    errEl.style.display = 'none';
    resultEl.style.display = 'none';

    if (!caseRef || !recoverySecret) {
      errEl.textContent = t('invalid_credentials');
      errEl.style.display = 'block';
      return;
    }

    try {
      const result = await api.checkStatus(caseRef, recoverySecret);

      document.getElementById('statusValue').textContent = result.status || '—';
      document.getElementById('statusCategory').textContent = result.category || '—';
      document.getElementById('statusSubmitted').textContent = formatDate(result.createdAt);
      document.getElementById('statusUpdated').textContent = formatDate(result.updatedAt);

      // Show response if present
      const responseRow = document.getElementById('statusResponseRow');
      if (result.response && result.response.trim()) {
        document.getElementById('statusResponse').textContent = result.response;
        responseRow.style.display = 'flex';
      } else {
        responseRow.style.display = 'none';
      }

      resultEl.style.display = 'block';
    } catch (err) {
      errEl.textContent = t('invalid_credentials');
      errEl.style.display = 'block';
    }
  });

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  // ─── Curiosity Corner ───────────────────────────────────────────
  // Connects to the backend API for question submission and response.
  // Pre-approved templates are returned for common questions.
  // Serious concerns are flagged and the user is told to report.

  document.getElementById('askBtn').addEventListener('click', async () => {
    const input = document.getElementById('curiosityInput');
    const resultEl = document.getElementById('curiosityResult');
    const question = input.value.trim();

    if (!question) return;

    resultEl.style.display = 'block';
    resultEl.innerHTML = '<p style="color:var(--gray)">Sending question…</p>';

    try {
      const result = await api.askCuriosity(question);

      if (result.suggestedAction === 'report') {
        // Serious concern detected — route to reporting
        resultEl.innerHTML = '<h3>⚠️</h3><p style="font-weight:600;color:#E63946;">' +
          escapeHtml(result.warning) +
          '</p><button class="submit-btn" data-view="report" style="margin-top:12px;">' +
          t('report_harm') + '</button>';
        // Attach the click handler for the report button
        resultEl.querySelector('[data-view="report"]').addEventListener('click', () => showView('report'));
      } else if (result.response) {
        // Got a pre-approved template response
        resultEl.innerHTML = '<h3>' + t('curiosity_response') + '</h3><p>' + escapeHtml(result.response) + '</p>' +
          '<p style="margin-top:8px;font-size:12px;color:var(--gray);">Ref: ' + escapeHtml(result.questionRef) + '</p>';
      } else {
        // Pending review
        resultEl.innerHTML = '<h3>📝</h3><p>' + t('curiosity_no_answer') + '</p>' +
          '<p style="margin-top:8px;font-size:12px;color:var(--gray);">Ref: ' + escapeHtml(result.questionRef) + '</p>';
      }
    } catch (err) {
      resultEl.innerHTML = '<p style="color:var(--red);">' + escapeHtml(err.message) + '</p>';
    }
  });

  // Quick questions
  document.querySelectorAll('.quick-q').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('curiosityInput').value = btn.dataset.q;
      document.getElementById('askBtn').click();
    });
  });

  // ─── Lesson expansion ───────────────────────────────────────────
  // Fetches lessons from the backend and renders them dynamically.
  let loadedLessons = null;

  async function loadLessons() {
    if (loadedLessons) return loadedLessons;
    try {
      const lang = window.GuardianI18n.getCurrentLang();
      loadedLessons = await api.getLessons(lang);
    } catch {
      loadedLessons = []; // Fall back to empty list
    }
    return loadedLessons;
  }

  // Render lessons when the learn view is shown
  document.querySelectorAll('[data-view="learn"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lessons = await loadLessons();
      renderLessons(lessons);
    });
  });

  function renderLessons(lessons) {
    const container = document.querySelector('#view-learn .lesson-card');
    // If there are already static lesson cards, replace them with dynamic ones
    const learnView = document.getElementById('view-learn');
    const existingCards = learnView.querySelectorAll('.lesson-card');

    if (existingCards.length > 0 && lessons.length > 0) {
      // Replace static cards with dynamic ones from backend
      const firstCard = existingCards[0];
      const fragment = document.createDocumentFragment();

      lessons.forEach(lesson => {
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.dataset.lessonId = lesson.id;

        card.innerHTML = `
          <span class="lesson-icon">${lesson.category === 'safety' ? '🛡' : '📚'}</span>
          <div class="lesson-body">
            <h3>${escapeHtml(lesson.title)}</h3>
            <p class="lesson-preview">${escapeHtml(lesson.description)}</p>
            ${lesson.hasQuiz ? '<span style="font-size:11px;color:var(--teal-dark);">📋 Quiz available</span>' : ''}
          </div>
          <span class="lesson-arrow">›</span>
        `;

        fragment.appendChild(card);
      });

      // Remove old cards
      existingCards.forEach(c => c.remove());
      // Insert new cards after the subtitle
      const subtitle = learnView.querySelector('.view-subtitle');
      subtitle.after(fragment);

      // Attach handlers to new cards
      learnView.querySelectorAll('.lesson-card').forEach(card => {
        card.addEventListener('click', () => openLesson(card.dataset.lessonId, card));
      });
    }
  }

  async function openLesson(lessonId, cardElement) {
    try {
      const lang = window.GuardianI18n.getCurrentLang();
      const lesson = await api.getLesson(lessonId, lang);

      // Expand the card to show full content
      const body = cardElement.querySelector('.lesson-body');
      const existingDetail = body.querySelector('.lesson-detail');

      if (existingDetail) {
        // Toggle: close if already open
        existingDetail.remove();
        cardElement.classList.remove('expanded');
        return;
      }

      cardElement.classList.add('expanded');
      const detail = document.createElement('div');
      detail.className = 'lesson-detail';
      detail.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-light);';

      let html = '<p style="white-space:pre-wrap;font-size:14px;color:var(--navy);margin-bottom:12px;">' + escapeHtml(lesson.content) + '</p>';

      // Show quiz if available
      if (lesson.quiz && lesson.quiz.length > 0) {
        html += '<div style="background:var(--cream);padding:12px;border-radius:8px;margin-top:8px;">';
        html += '<strong style="font-size:13px;">Quick Check</strong>';
        lesson.quiz.forEach((q, qi) => {
          html += '<div style="margin:8px 0;"><p style="font-size:13px;font-weight:600;">' + escapeHtml(q.question) + '</p>';
          q.options.forEach((opt, oi) => {
            html += '<label style="display:flex;gap:6px;padding:4px 0;font-size:13px;cursor:pointer;">' +
              '<input type="radio" name="quiz-' + lessonId + '-' + qi + '" value="' + oi + '" style="accent-color:var(--teal-dark);">' +
              escapeHtml(opt) + '</label>';
          });
          html += '</div>';
        });
        html += '<button class="submit-btn" style="margin-top:8px;padding:8px 16px;font-size:13px;" id="quiz-submit-' + lessonId + '">Submit Quiz</button>';
        html += '<div id="quiz-result-' + lessonId + '" style="margin-top:8px;"></div>';
        html += '</div>';
      }

      detail.innerHTML = html;
      body.appendChild(detail);

      // Attach quiz submit handler
      const quizBtn = document.getElementById('quiz-submit-' + lessonId);
      if (quizBtn) {
        quizBtn.addEventListener('click', () => {
          const answers = [];
          lesson.quiz.forEach((q, qi) => {
            const selected = document.querySelector('input[name="quiz-' + lessonId + '-' + qi + '"]:checked');
            answers.push(selected ? parseInt(selected.value) : -1);
          });

          // Score locally (no auth needed for PWA demo)
          let score = 0;
          lesson.quiz.forEach((q, i) => {
            if (answers[i] === q.correctAnswer) score++;
          });

          const passed = score >= Math.ceil(lesson.quiz.length * 0.6);
          const resultEl = document.getElementById('quiz-result-' + lessonId);
          resultEl.innerHTML = '<p style="font-weight:600;color:' + (passed ? 'var(--green)' : 'var(--amber)') + ';">' +
            'Score: ' + score + '/' + lesson.quiz.length + (passed ? ' — Passed!' : ' — Try again') + '</p>';
        });
      }
    } catch (err) {
      // Fall back to static content if backend is unavailable
      cardElement.classList.toggle('expanded');
    }
  }

  // Also handle clicks on static lesson cards (initial render)
  document.querySelectorAll('.lesson-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.lessonId) {
        openLesson(card.dataset.lessonId, card);
      } else {
        // Static card — toggle expansion
        card.classList.toggle('expanded');
        const preview = card.querySelector('.lesson-preview');
        if (card.classList.contains('expanded')) {
          preview.style.display = 'block';
          preview.style.webkitLineClamp = 'unset';
          preview.style.webkitBoxOrient = 'unset';
          preview.style.overflow = 'visible';
        } else {
          preview.style.display = '-webkit-box';
          preview.style.webkitLineClamp = '2';
          preview.style.webkitBoxOrient = 'vertical';
          preview.style.overflow = 'hidden';
        }
      }
    });
  });

  // ─── Escape HTML for safe display ──────────────────────────────
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── Init ───────────────────────────────────────────────────────
  applyTranslations();
  showView('home');

  // Register service worker (if supported)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
