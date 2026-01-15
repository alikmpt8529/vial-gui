
import { useState } from 'react'
import { VialKeyboard } from './protocol/vial'
import { KeyboardVisualizer } from './components/KeyboardVisualizer'
import { generatePDF } from './utils/pdfGenerator'
import './App.css'

function App() {
  const [keyboard, setKeyboard] = useState(null)
  const [status, setStatus] = useState("Disconnected")
  const [info, setInfo] = useState(null)
  const [activeLayer, setActiveLayer] = useState(0)
  const [keymapBuffer, setKeymapBuffer] = useState(null)

  const handleConnect = async () => {
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [
          { usagePage: 0xFF60, usage: 0x61 },
        ]
      });

      if (devices.length === 0) return;

      const device = devices[0];
      const kb = new VialKeyboard(device);
      setStatus("Connecting...");

      await kb.connect();
      await kb.load_definition();
      const keymap = await kb.load_keymap();

      setKeyboard(kb);
      setKeymapBuffer(keymap);

      setInfo({
        name: device.productName,
        rows: kb.rows,
        cols: kb.cols,
        layers: kb.layers,
        def_name: kb.definition.name
      });
      setStatus("Connected");

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  }

  const handleExportPdf = () => {
    if (!keyboard || !keymapBuffer) return;

    generatePDF(
      keyboard.definition,
      keymapBuffer,
      keyboard.layers,
      keyboard.rows,
      keyboard.cols,
      `${info.name}_layout.pdf`
    );
  }

  return (
    <div className="container">
      <h1>Vial Web PDF Exporter</h1>
      <div className="card">
        {status !== "Connected" && (
          <button onClick={handleConnect}>
            Connect Keyboard
          </button>
        )}
        <p>Status: {status}</p>

        {info && (
          <div className="info">
            <h2>{info.name}</h2>
            <p>Layout: {info.def_name} | Layers: {info.layers}</p>

            <div className="controls">
              <label>Layer: </label>
              <select value={activeLayer} onChange={(e) => setActiveLayer(Number(e.target.value))}>
                {Array.from({ length: info.layers }, (_, i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <button onClick={handleExportPdf} style={{ marginLeft: '10px' }}>
                Export PDF (All Layers)
              </button>
            </div>

            <KeyboardVisualizer
              definition={keyboard.definition}
              keymap={keymapBuffer}
              layer={activeLayer}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
