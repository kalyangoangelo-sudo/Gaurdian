import { Routes, Route, useLocation } from 'react-router-dom';
import LanguageToggle from './components/LanguageToggle';
import ReportHarmButton from './components/ReportHarmButton';

// Child portal (public, no login)
import ChildHome from './portals/child/ChildHome';
import ChildReport from './portals/child/ChildReport';
import ChildStatus from './portals/child/ChildStatus';
import ChildCuriosity from './portals/child/ChildCuriosity';
import ChildLearn from './portals/child/ChildLearn';
import ChildPlans from './portals/child/ChildPlans';

// Parent portal
import ParentLogin from './portals/parent/ParentLogin';
import ParentDashboard from './portals/parent/ParentDashboard';

// Teacher portal
import TeacherLogin from './portals/teacher/TeacherLogin';
import TeacherDashboard from './portals/teacher/TeacherDashboard';

// Counselor portal
import CounselorLogin from './portals/counselor/CounselorLogin';
import CounselorDashboard from './portals/counselor/CounselorDashboard';
import CaseDetail from './portals/counselor/CaseDetail';
import CuriosityReview from './portals/counselor/CuriosityReview';

// Admin portal
import AdminLogin from './portals/admin/AdminLogin';
import AdminDashboard from './portals/admin/AdminDashboard';

function Header() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 bg-navy text-white">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
        <span className="text-2xl">🛡</span>
        <span className="text-lg font-bold tracking-wide">GuardianLink</span>
      </div>
      <LanguageToggle />
    </header>
  );
}

// Routes that show the Report Harm button (child-facing, public)
const CHILD_ROUTES = ['/', '/report', '/status', '/curiosity', '/learn', '/plans'];

export default function App() {
  const location = useLocation();
  const showFab = CHILD_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pb-24">
        <Routes>
          {/* Child Portal — public, no login required */}
          <Route path="/" element={<ChildHome />} />
          <Route path="/report" element={<ChildReport />} />
          <Route path="/status" element={<ChildStatus />} />
          <Route path="/curiosity" element={<ChildCuriosity />} />
          <Route path="/learn" element={<ChildLearn />} />
          <Route path="/plans" element={<ChildPlans />} />

          {/* Parent Portal */}
          <Route path="/parent" element={<ParentLogin />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />

          {/* Teacher Portal */}
          <Route path="/teacher" element={<TeacherLogin />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />

          {/* Counselor Portal */}
          <Route path="/counselor" element={<CounselorLogin />} />
          <Route path="/counselor/dashboard" element={<CounselorDashboard />} />
          <Route path="/counselor/case/:id" element={<CaseDetail />} />
          <Route path="/counselor/curiosity" element={<CuriosityReview />} />

          {/* Admin Portal */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </main>
      {showFab && <ReportHarmButton />}
    </div>
  );
}
