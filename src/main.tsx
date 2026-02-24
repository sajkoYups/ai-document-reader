import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import PageHelmet from "./components/PageHelmet";
import App from "./App";
import Landing from "./pages/Landing";
import About from "./pages/About";
import WhoIsThisFor from "./pages/WhoIsThisFor";
import HowDoesItWork from "./pages/HowDoesItWork";
import WhatElseDoWeDo from "./pages/WhatElseDoWeDo";
import Mission from "./pages/Mission";
import Vision from "./pages/Vision";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <PageHelmet />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<App />} />
            <Route path="/about" element={<About />} />
            <Route path="/who-is-this-for" element={<WhoIsThisFor />} />
            <Route path="/how-does-it-work" element={<HowDoesItWork />} />
            <Route path="/what-else-do-we-do" element={<WhatElseDoWeDo />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/vision" element={<Vision />} />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
