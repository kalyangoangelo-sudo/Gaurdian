import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://192.168.100.167:3001';

export async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string): Promise<any> {
  const h = await getAuthHeader();
  const r = await fetch(`${API_BASE_URL}${path}`, { headers: h });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function apiPost(path: string, body: object): Promise<any> {
  const h = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
  const r = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function apiPut(path: string, body: object): Promise<any> {
  const h = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
  const r = await fetch(`${API_BASE_URL}${path}`, { method: 'PUT', headers: h, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
