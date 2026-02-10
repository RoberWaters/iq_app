import { motion } from 'framer-motion';

const variants = {
  primary: {
    background: 'var(--color-primary)',
    color: '#fff',
  },
  success: {
    background: 'var(--color-success)',
    color: '#fff',
  },
  danger: {
    background: 'var(--color-error)',
    color: '#fff',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-primary)',
    border: '2px solid var(--color-primary)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
};

export default function Button({
  children, onClick, variant = 'primary', disabled = false, size = 'md', style = {}, ...props
}) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '14px 28px' : '10px 20px',
    fontSize: size === 'sm' ? '0.85rem' : size === 'lg' ? '1.05rem' : '0.95rem',
    ...variants[variant],
    ...style,
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      style={baseStyle}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
