import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Rules from "./Rules";

import RuleEditor from "./RuleEditor";

import Settings from "./Settings";

import RuleReviewer from "./RuleReviewer";

import Logs from "./Logs";

import ChangePassword from "./ChangePassword";

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
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Rules" element={<Rules />} />
                
                <Route path="/RuleEditor" element={<RuleEditor />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/RuleReviewer" element={<RuleReviewer />} />
                
                <Route path="/Logs" element={<Logs />} />
                
                <Route path="/ChangePassword" element={<ChangePassword />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}