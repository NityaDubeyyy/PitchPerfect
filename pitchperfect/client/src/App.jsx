import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPages';
import PresenterPage from './pages/PresenterPages';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/present/:id" element={<PresenterPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}