import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

// Set up global CSS variable for chart colors (used in technicalAnalysis.ts)
const style = document.createElement('style');
style.textContent = `
  :root {
    --profit: #10B981;
    --loss: #EF4444;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
