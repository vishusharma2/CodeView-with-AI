import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/home/Home';
import EditorPage from './Pages/editor/EditorPage';
import MeetingLogin from './Pages/meeting/MeetingLogin';
import MeetingPage from './Pages/meeting/MeetingPage';
import NewRoom from './Pages/home/NewRoom';
import PasswordVerify from './Pages/home/PasswordVerify';
import { Toaster } from 'react-hot-toast';

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

      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-room" element={<NewRoom />} />
          <Route path="/verify-password/:roomId" element={<PasswordVerify />} />
          <Route path="/editor/:roomId" element={<EditorPage />} />
          <Route path="/meetinglogin" element={<MeetingLogin />} />
          <Route path="/room/:roomId" element={<MeetingPage />} />

          {/* Add this so your users don’t land in hell when visiting a wrong URL */}
          <Route path="*" element={<div>404 — Page Not Found</div>} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
