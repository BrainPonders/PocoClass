import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Rules from "./Rules";

import RuleEditor from "./RuleEditor";

import Settings from "./Settings";

import RuleReviewer from "./RuleReviewer";

import Logs from "./Logs";

import ChangePassword from "./ChangePassword";

import SetupWizard from "./SetupWizard";

import Login from "./Login";

import AuthGuard from "@/components/AuthGuard";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Rules: Rules,
    
    RuleEditor: RuleEditor,
    
    Settings: Settings,
    
    RuleReviewer: RuleReviewer,
    
    Logs: Logs,
    
    ChangePassword: ChangePassword,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <AuthGuard>
            <Routes>
                {/* Public routes (no layout) */}
                <Route path="/setup" element={<SetupWizard />} />
                <Route path="/login" element={<Login />} />
                
                {/* Protected routes (with layout) */}
                <Route path="/" element={<Layout currentPageName={currentPage}><Dashboard /></Layout>} />
                <Route path="/Dashboard" element={<Layout currentPageName={currentPage}><Dashboard /></Layout>} />
                <Route path="/Rules" element={<Layout currentPageName={currentPage}><Rules /></Layout>} />
                <Route path="/RuleEditor" element={<Layout currentPageName={currentPage}><RuleEditor /></Layout>} />
                <Route path="/Settings" element={<Layout currentPageName={currentPage}><Settings /></Layout>} />
                <Route path="/RuleReviewer" element={<Layout currentPageName={currentPage}><RuleReviewer /></Layout>} />
                <Route path="/Logs" element={<Layout currentPageName={currentPage}><Logs /></Layout>} />
                <Route path="/ChangePassword" element={<Layout currentPageName={currentPage}><ChangePassword /></Layout>} />
            </Routes>
        </AuthGuard>
    );
}

export default function Pages() {
    return (
        <UnsavedChangesProvider>
            <Router>
                <PagesContent />
            </Router>
        </UnsavedChangesProvider>
    );
}