import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import StoryEditor from "./components/StoryEditor";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/story-editor" element={<StoryEditor />} />
                <Route path="/" element={<div>Welcome to the D&D Campaign Manager!</div>} />
            </Routes>
        </Router>
    );
}

export default App;