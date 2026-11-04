import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { auth } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export default function ParentLogin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(username, password);
      if (res.role !== 'parent') throw new Error('This account is not a parent account.');
      login(res.token, res.role, username, res.id || 'parent-1');
      navigate('/parent/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-8 max-w-sm mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <span className="text-5xl">👨‍👩‍👧</span>
        <h2 className="text-xl font-bold mt-2">{t('parent_dashboard')}</h2>
      </div>
      <div className="card">
        <div className="mb-4">
          <label className="label">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="parent" />
        </div>
        <div className="mb-4">
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>
        <button onClick={handleLogin} disabled={loading || !username || !password} className="btn-primary">{loading ? '...' : t('login')}</button>
        {error && <div className="mt-3 p-2.5 bg-red-50 rounded-xl text-red-600 text-sm font-semibold">{error}</div>}
        <p className="text-center text-sm text-gray-500 mt-4">Demo: <code className="bg-cream px-1.5 py-0.5 rounded text-xs">parent / Parent123!</code></p>
      </div>
      <button onClick={() => navigate('/')} className="btn-ghost w-full mt-4">{t('back')}</button>
    </div>
  );
}
