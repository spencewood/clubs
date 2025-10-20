import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

async function enableMocking() {
	// Enable MSW in development if VITE_ENABLE_MSW is set
	if (import.meta.env.VITE_ENABLE_MSW === "true") {
		const { worker } = await import("./mocks/browser");

		return worker.start({
			onUnhandledRequest: "bypass", // Don't warn about unhandled requests
		});
	}
}

enableMocking().then(() => {
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
});
