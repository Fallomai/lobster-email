import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '@/pages/landing';
import { InboxPage } from '@/pages/inbox';
import { AdminPage } from '@/pages/admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
