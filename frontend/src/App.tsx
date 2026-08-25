import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { WorkflowDetail } from "./pages/WorkflowDetail";

function App() {
  return (
    <div className="min-h-screen" style={{ background: "var(--page)" }}>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workflows/:id" element={<WorkflowDetail />} />
      </Routes>
    </div>
  );
}

export default App;
