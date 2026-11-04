import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { lessons } from '../../api/client';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [lessonList, setLessonList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/teacher'); return; }
    Promise.all([
      lessons.list().then(setLessonList).catch(() => {}),
      lessons.assignments(user.id).then(setAssignments).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [user]);

  async function handleAssign() {
    if (!selectedLesson) return;
    try { await lessons.assign(selectedLesson, classId || undefined); setAssignments(await lessons.assignments(user!.id)); setClassId(''); } catch {}
  }

  function fmtDate(iso: string) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

  if (loading) return <div className="pt-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="pt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="view-title">{t('teacher_dashboard')}</h2>
        <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost">{t('logout')}</button>
      </div>

      {/* Assign lesson */}
      <div className="card mb-4">
        <h3 className="font-bold text-navy mb-3">{t('assign_lesson')}</h3>
        <select className="input mb-3" value={selectedLesson} onChange={(e) => setSelectedLesson(e.target.value)}>
          <option value="">Select lesson…</option>
          {lessonList.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <input className="input mb-3" placeholder="Class ID (optional)" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <button onClick={handleAssign} disabled={!selectedLesson} className="btn-primary" style={{ width: 'auto', display: 'inline-block' }}>{t('assign_lesson')}</button>
      </div>

      {/* My assignments */}
      <div className="card">
        <h3 className="font-bold text-navy mb-3">{t('my_assignments')}</h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500">No assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="p-3 bg-cream rounded-xl">
                <p className="font-semibold text-sm text-navy">{a.lessonTitle}</p>
                <p className="text-xs text-gray-500">Class: {a.classId || 'all'} — {fmtDate(a.assignedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">Teachers cannot access confidential child reports or private Curiosity Corner questions.</p>
    </div>
  );
}
