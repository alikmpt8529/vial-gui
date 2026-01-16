
import { useState } from 'react'
import { VialKeyboard } from './protocol/vial'
import { KeyboardVisualizer } from './components/KeyboardVisualizer'
import { generatePDF } from './utils/pdfGenerator'
import './App.css'

const UsageGuideModal = ({ onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose}>&times;</button>
      <div className="usage-guide">
        <h2>Vial Web PDF Exporter 使い方ガイド</h2>
        <p>このWebアプリケーションは、Vial互換キーボードに接続し、キーマップレイアウトをPDFファイルとしてエクスポートすることができます。</p>

        <h3>前提条件</h3>
        <ul>
          <li><strong>ブラウザ</strong>: WebHIDをサポートするブラウザ（Chrome, Edge, Operaなど）。</li>
          <li><strong>デバイス</strong>: Vial互換ファームウェアを実行しているキーボード。</li>
        </ul>

        <h3>使い方</h3>
        <ol>
          <li>
            <strong>キーボードの接続</strong>:
            "Connect Keyboard" ボタンをクリックし、ポップアップからデバイスを選択します。
          </li>
          <li>
            <strong>レイアウトの表示</strong>:
            接続されると、レイアウトとキーマップが自動的に読み込まれます。
          </li>
          <li>
            <strong>レイヤーの選択</strong>:
            "Layer" ドロップダウンを使用して、異なるレイヤーを確認できます。
          </li>
          <li>
            <strong>PDFのエクスポート</strong>:
            "Export PDF" をクリックして、全レイヤーのレイアウトをダウンロードします。
          </li>
        </ol>

        <hr style={{ margin: '2rem 0', borderColor: '#444' }} />

        <h2>Vial Web PDF Exporter Usage Guide</h2>
        <p>This web application allows you to connect to a Vial-compatible keyboard and export its keymap layout to a PDF file.</p>

        <h3>Prerequisites</h3>
        <ul>
          <li><strong>Browser</strong>: A browser that supports WebHID (Chrome, Edge, Opera).</li>
          <li><strong>Device</strong>: A keyboard running Vial-compatible firmware.</li>
        </ul>

        <h3>How to Use</h3>
        <ol>
          <li>
            <strong>Connect Keyboard</strong>:
            Click the "Connect Keyboard" button and select your device from the popup.
          </li>
          <li>
            <strong>View Layout</strong>:
            Once connected, the layout and keymap will load automatically.
          </li>
          <li>
            <strong>Select Layer</strong>:
            Use the "Layer" dropdown to inspect different layers.
          </li>
          <li>
            <strong>Export PDF</strong>:
            Click "Export PDF" to download the layout for all layers.
          </li>
        </ol>
      </div>
    </div>
  </div>
);

function App() {
  const [keyboard, setKeyboard] = useState(null)
  const [status, setStatus] = useState("Disconnected")
  const [info, setInfo] = useState(null)
  const [activeLayer, setActiveLayer] = useState(0)
  const [keymapBuffer, setKeymapBuffer] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

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
      <button className="help-button" onClick={() => setShowHelp(true)}>
        Help
      </button>
      {showHelp && <UsageGuideModal onClose={() => setShowHelp(false)} />}
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
