import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import Button from '../common/Button';

// Convert plain symbol like "V_EDTA" → LaTeX "V_{EDTA}" for inline rendering
function symToLatex(symbol) {
  return symbol.replace(/_([A-Za-z0-9]+)/g, '_{$1}');
}

function InlineLatex({ symbol }) {
  const html = katex.renderToString(symToLatex(symbol), { throwOnError: false, displayMode: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function CalculationForm({ variables, onSubmit, onAutoCalculate, result }) {
  const [values, setValues] = useState({});
  const [studentResult, setStudentResult] = useState('');

  const handleChange = (symbol, val) => {
    setValues((prev) => ({ ...prev, [symbol]: val }));
  };

  // Non-constant variables must all be filled to enable the action buttons
  const requiredVars = (variables || []).filter((v) => v.source !== 'constant');
  const requiredFilled = requiredVars.every((v) => values[v.symbol]?.trim() !== '' && values[v.symbol] != null);

  return (
    <div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Variables de la fórmula</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {(variables || []).map((v) => (
          <div key={v.symbol} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px',
            background: v.source === 'constant' ? 'var(--color-border-light)' : '#fff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{v.name}</div>
              <div style={{ fontSize: '0.95rem', lineHeight: 1 }}>
                <InlineLatex symbol={v.symbol} />
              </div>
            </div>
            {v.source === 'constant' ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {v.value} {v.unit}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  step="any"
                  value={values[v.symbol] ?? ''}
                  onChange={(e) => handleChange(v.symbol, e.target.value)}
                  placeholder={v.unit}
                  style={{
                    width: '100px', padding: '6px 10px',
                    border: `1px solid ${values[v.symbol]?.trim() ? 'var(--color-success)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{v.unit}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        padding: '14px',
        background: '#F0F7FF',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px',
        border: '1px solid #BFDBFE',
      }}>
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>
          Tu resultado calculado:
        </label>
        <input
          type="number"
          step="any"
          value={studentResult}
          onChange={(e) => setStudentResult(e.target.value)}
          placeholder="Escribe tu resultado aquí"
          style={{
            width: '100%', padding: '10px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        />
      </div>

      {!requiredFilled && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
          Ingresa todos los valores de las variables para continuar.
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          onClick={() => onSubmit(parseFloat(studentResult))}
          disabled={!requiredFilled || !studentResult}
          style={{ flex: 1 }}
        >
          Verificar cálculo
        </Button>
        <Button
          onClick={onAutoCalculate}
          disabled={!requiredFilled}
          variant="outline"
        >
          Calcular automáticamente
        </Button>
      </div>

      {result && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: result.is_within_tolerance ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${result.is_within_tolerance ? '#BBF7D0' : '#FECACA'}`,
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: result.is_within_tolerance ? 'var(--color-success)' : 'var(--color-error)' }}>
            {result.is_within_tolerance ? 'Correcto' : 'Incorrecto'}
          </div>
          <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Resultado correcto: <strong>{result.correct_result}</strong></div>
            <div>Tu resultado: <strong>{result.student_result}</strong></div>
            <div>Error: <strong>{result.percent_error}%</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
