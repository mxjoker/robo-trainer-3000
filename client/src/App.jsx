import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import AcceptInvite from './pages/AcceptInvite'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import Partner from './pages/Partner'
import Settings from './pages/Settings'
import Photos from './pages/Photos'
import WorkoutLogger from './screens/WorkoutLogger'
import SharedWorkoutLogger from './screens/SharedWorkoutLogger'
import WellnessLogger from './screens/WellnessLogger'
import BottomNav from './components/BottomNav'
import FAB from './components/FAB'

const styles = {
  app: { display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto' },
  main: { flex: 1, overflowY: 'auto', paddingBottom: 80 }
}

function ProtectedLayout() {
  return (
    <div style={styles.app}>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/log/workout" element={<WorkoutLogger />} />
          <Route path="/log/workout/shared" element={<SharedWorkoutLogger />} />
          <Route path="/log/wellness" element={<WellnessLogger />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <BottomNav />
      <FAB />
    </div>
  )
}

export default function App() {
  const { currentUser, loading } = useAuth()
  if (loading) return <div style={{ padding: 24, color: '#666' }}>Loading...</div>
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }
  return <ProtectedLayout />
}
