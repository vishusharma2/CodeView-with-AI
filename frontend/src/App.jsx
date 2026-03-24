import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './Pages/landing/LandingPage';
import Home from './Pages/home/Home';
import EditorPage from './Pages/editor/EditorPage';
import MeetingLogin from './Pages/meeting/MeetingLogin';
import MeetingPage from './Pages/meeting/MeetingPage';
import NewRoom from './Pages/home/NewRoom';
import PasswordVerify from './Pages/home/PasswordVerify';
import NotFound from './Pages/notfound/NotFound';
import { Toaster } from 'react-hot-toast';
import AnimatedRoutes from './components/AnimatedRoutes';

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            theme: { primary: "#4aed88" }
          },
        }}
      />

      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AnimatedRoutes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<Home />} />
          <Route path="/new-room" element={<NewRoom />} />
          <Route path="/verify-password/:roomId" element={<PasswordVerify />} />
          <Route path="/editor/:roomId" element={<EditorPage />} />
          <Route path="/meetinglogin" element={<MeetingLogin />} />
          <Route path="/room/:roomId" element={<MeetingPage />} />

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </AnimatedRoutes>
      </Router>
    </>
  );
}

export default App;
