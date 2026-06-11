// No StrictMode: it double-mounts effects in dev, which would spawn two WebGL contexts in GameCanvas.
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
