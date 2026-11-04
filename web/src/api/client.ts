/**
 * API client for GuardianLink web application.
 *
 * All calls go to the Express backend (proxied by Vite in dev, same-origin in prod).
 * The token is read from localStorage and sent as Bearer JWT.
 */

const BASE = '';

function getToken(): string | null {
  return localStorage.getItem('gl_token');
}

async function apiFetch<T = any>(method: string, path: string, body?: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.removeItem('gl_token');
    localStorage.removeItem('gl_user');
    window.location.href = '/';
    throw new Error('Session expired');
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────
export const auth = {
  login: async (username: string, password: string) => {
    const res = await apiFetch<{ token: string; role?: string; user?: { id: string; username: string; role: string } }>('POST', '/login', { username, password });
    // /login returns { token, user: { id, username, role } }
    // /auth/caseworker/login returns { token, role }
    return { token: res.token, role: res.role || res.user?.role || '', id: res.user?.id || '' };
  },
  caseworkerLogin: (username: string, password: string) =>
    apiFetch<{ token: string; role: string }>('POST', '/auth/caseworker/login', { username, password }),
};

// ── Reports ───────────────────────────────────────────────────────
export const reports = {
  anonymous: (category: string, description: string, safeToContact: boolean) =>
    apiFetch<{ caseRef: string; recoverySecret: string }>('POST', '/reports/anonymous', { category, description, safeToContact }),
  authenticated: (category: string, description: string, safeToContact: boolean) =>
    apiFetch('POST', '/reports/authenticated', { category, description, safeToContact }),
  checkStatus: (caseRef: string, recoverySecret: string) =>
    apiFetch<{ caseRef: string; status: string; category: string; createdAt: string; updatedAt: string; response: string | null }>('POST', '/reports/check-status', { caseRef, recoverySecret }),
};

// ── Cases ─────────────────────────────────────────────────────────
export const cases = {
  list: () => apiFetch<any[]>('GET', '/cases'),
  detail: (id: string) => apiFetch<any>('GET', `/cases/${id}`),
  assess: (id: string, humanPriority: string) => apiFetch('PUT', `/cases/${id}/assess`, { humanPriority }),
  note: (id: string, note: string) => apiFetch('PUT', `/cases/${id}/note`, { note }),
  status: (id: string, status: string) => apiFetch('PUT', `/cases/${id}/status`, { status }),
  refer: (id: string, service?: string) => apiFetch('POST', `/cases/${id}/refer`, service ? { service } : {}),
  response: (id: string, response: string, responseTemplate?: string) => apiFetch('PUT', `/cases/${id}/response`, { response, responseTemplate }),
  audit: (id: string) => apiFetch<any[]>('GET', `/cases/${id}/audit`),
};

// ── Requests (access requests) ────────────────────────────────────
export const requests = {
  list: () => apiFetch<{ requests: any[] }>('GET', '/requests'),
  create: (url: string) => apiFetch('POST', '/requests', { url }),
  decide: (id: string, decision: 'approved' | 'denied') => apiFetch('POST', `/requests/${id}/decision`, { decision }),
};

// ── SafeSignal ────────────────────────────────────────────────────
export const safesignal = {
  list: (parentId: string) => apiFetch<any[]>('GET', `/safesignal/${parentId}`),
  acknowledge: (id: string) => apiFetch('PUT', `/safesignal/${id}/acknowledge`),
};

// ── Pairing ───────────────────────────────────────────────────────
export const pairing = {
  generate: () => apiFetch<{ code: string }>('POST', '/pair/generate'),
  confirm: (code: string) => apiFetch('POST', '/pair/confirm', { code }),
};

// ── Policy ───────────────────────────────────────────────────────
export const policy = {
  get: (childId: string) => apiFetch<any>('GET', `/policy/${childId}`),
  update: (childId: string, data: any) => apiFetch('PUT', `/policy/${childId}`, data),
};

// ── Heartbeat ─────────────────────────────────────────────────────
export const heartbeat = {
  status: (childId: string) => apiFetch<any>('GET', `/device-status/${childId}`),
};

// ── Removal ──────────────────────────────────────────────────────
export const removal = {
  list: () => apiFetch<any[]>('GET', '/removal-requests'),
  create: (reason: string) => apiFetch('POST', '/removal-request', { reason }),
};

// ── Curiosity Corner ──────────────────────────────────────────────
export const curiosity = {
  ask: (question: string) => apiFetch<{ id: string; questionRef: string; status: string; response?: string; warning?: string; suggestedAction?: string }>('POST', '/curiosity/ask', { question }),
  status: (id: string) => apiFetch<any>('GET', `/curiosity/${id}`),
  pending: () => apiFetch<any[]>('GET', '/curiosity/pending'),
  respond: (id: string, response: string, templateKey?: string) => apiFetch('PUT', `/curiosity/${id}/respond`, { response, templateKey }),
  categorize: (id: string, category: string) => apiFetch('PUT', `/curiosity/${id}/categorize`, { category }),
};

// ── Lessons ───────────────────────────────────────────────────────
export const lessons = {
  list: (lang?: string, ageBand?: string) => {
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    if (ageBand) params.set('ageBand', ageBand);
    const qs = params.toString();
    return apiFetch<any[]>('GET', `/lessons${qs ? '?' + qs : ''}`);
  },
  detail: (id: string, lang?: string) => apiFetch<any>('GET', `/lessons/${id}${lang ? '?lang=' + lang : ''}`),
  create: (data: any) => apiFetch('POST', '/lessons', data),
  assign: (lessonId: string, classId?: string) => apiFetch('POST', '/lessons/assign', { lessonId, classId }),
  assignments: (teacherId: string) => apiFetch<any[]>('GET', `/lessons/assignments/${teacherId}`),
  progress: (childId: string) => apiFetch<any[]>('GET', `/lessons/progress/${childId}`),
};

// ── Organizations & Subscriptions ─────────────────────────────────
export const organizations = {
  register: (name: string, type: string, plan: string, contactEmail?: string) =>
    apiFetch<{ id: string; name: string; type: string; plan: string; status: string }>('POST', '/organizations/register', { name, type, plan, contactEmail }),
  demoRequest: (contactName: string, contactEmail: string, orgName?: string, message?: string) =>
    apiFetch('POST', '/organizations/demo-request', { contactName, contactEmail, orgName, message }),
};

export const subscriptions = {
  get: (orgId: string) => apiFetch<any>('GET', `/subscriptions/${orgId}`),
  create: (orgId: string, plan: string) => apiFetch('POST', '/subscriptions', { orgId, plan }),
  changePlan: (orgId: string, plan: string) => apiFetch('PUT', `/subscriptions/${orgId}/plan`, { plan }),
  billing: (orgId: string, amount?: number, method?: string) => apiFetch('POST', `/subscriptions/${orgId}/billing`, { amount, method }),
  billingHistory: (orgId: string) => apiFetch<any[]>('GET', `/subscriptions/${orgId}/billing`),
  entitlements: (orgId: string) => apiFetch<any>('GET', `/subscriptions/${orgId}/entitlements`),
};

// ── Health ────────────────────────────────────────────────────────
export const health = {
  check: () => apiFetch<{ status: string; timestamp: string }>('GET', '/health'),
};

// Category mapping for picture-based reporting
export const PICTURE_CATEGORIES: Record<string, string> = {
  bullying: 'Cyberbullying',
  threats: 'Threats',
  private_pics: 'Sextortion',
  harassment: 'Online Harassment',
  impersonation: 'Impersonation',
  unwanted: 'Online Harassment',
  other: 'Other',
};

export const REFERRAL_SERVICES = [
  'Childline Uganda 116',
  'Uganda Police Child Protection Unit',
  'UNICEF Uganda',
  'Save the Children Uganda',
  'Ministry of Gender Uganda',
];

export const RESPONSE_TEMPLATES = [
  { id: 'received', title: 'Report received — acknowledgment', body: 'Thank you for reporting this. We have received your report and a trained person is reviewing it. You are not alone. Please check back here for updates using your case reference and recovery code.' },
  { id: 'reviewing', title: 'Under review — information request', body: 'Your report is being reviewed by a safeguarding professional. We may need to share limited information with the appropriate authorities to keep you safe. If you are in immediate danger, please call 116 (Child Helpline) or 999 (Police).' },
  { id: 'referred', title: 'Referred — external support', body: 'Your report has been referred to an appropriate child protection service. A professional will follow up. If you need urgent help, call 116 or 999.' },
  { id: 'resolved', title: 'Resolved — case closed', body: 'Your case has been reviewed and appropriate action has been taken. If you experience anything similar in the future, please submit a new report. You are not alone — help is always available.' },
  { id: 'safety_tips', title: 'Safety guidance — general', body: 'Here are steps you can take: 1) Tell a trusted adult. 2) Do not reply to the person. 3) Save any messages. 4) Block the person if possible. 5) Call 116 (Child Helpline) for support. You did the right thing by reporting.' },
];
