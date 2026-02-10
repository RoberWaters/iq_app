import { useState } from 'react';
import Button from '../common/Button';

export default function CalculationForm({ variables, onSubmit, onAutoCalculate, result }) {
  const [values, setValues] = useState({});
  const [studentResult, setStudentResult] = useState('');

  const handleChange = (symbol, val) => {
    setValues((prev) => ({ ...prev, [symbol]: val }));
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Variables de la fórmula</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {variables.map((v) => (
          <div key={v.symbol} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px',
            background: v.source === 'constant' ? 'var(--color-border-light)' : '#fff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{v.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem' }}>
                {v.symbol}
              </div>
            </div>
            {v.source === 'constant' ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {v.value} {v.unit}
              </div>
            ) : (
              <input
                type="number"
                step="any"
                value={values[v.symbol] || ''}
                onChange={(e) => handleChange(v.symbol, e.target.value)}
                placeholder={v.description || v.unit}
                style={{
                  width: '120px', padding: '6px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                }}
              />
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

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          onClick={() => onSubmit(parseFloat(studentResult))}
          disabled={!studentResult}
          style={{ flex: 1 }}
        >
          Verificar cálculo
        </Button>
        <Button onClick={onAutoCalculate} variant="outline">
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
