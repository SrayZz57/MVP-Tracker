export default function Button({ variant = 'ghost', size, className = '', ...props }) {
  return (
    <button
      className={['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
