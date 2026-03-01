import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/layout/Header';
import StepIndicator from './components/layout/StepIndicator';
import S1_PracticeSelect from './components/stages/S1_PracticeSelect';
import S2_MaterialSetup from './components/stages/S2_MaterialSetup';
import S3_Measurement from './components/stages/S3_Measurement';
import S4_Assembly from './components/stages/S4_Assembly';
import S5_Execution from './components/stages/S5_Execution';
import S6_Recording from './components/stages/S6_Recording';
import S7_Calculation from './components/stages/S7_Calculation';
import S8_TitrationCurve from './components/stages/S8_TitrationCurve';
import S9_Evaluation from './components/stages/S9_Evaluation';
import useSimulatorStore from './store/useSimulatorStore';

function App() {
  const { practiceId } = useSimulatorStore();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header />
      {practiceId && <StepIndicator />}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<S1_PracticeSelect />} />
            <Route path="/practice/:id/stage/2" element={<S2_MaterialSetup />} />
            <Route path="/practice/:id/stage/3" element={<S3_Measurement />} />
            <Route path="/practice/:id/stage/4" element={<S4_Assembly />} />
            <Route path="/practice/:id/stage/5" element={<S5_Execution />} />
            <Route path="/practice/:id/stage/6" element={<S6_Recording />} />
            <Route path="/practice/:id/stage/7" element={<S7_Calculation />} />
            <Route path="/practice/:id/stage/8" element={<S8_TitrationCurve />} />
            <Route path="/practice/:id/stage/9" element={<S9_Evaluation />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
