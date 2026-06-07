import MissionControl from "./example";
import { useNativeSplash } from "./hooks/useNativeSplash";
import "./index.css";

function App() {
  useNativeSplash();
  return <MissionControl />;
}

export default App;
