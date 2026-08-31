export default function Badge({ tone, className = '', ...props }) {
  return (
    <span
      className={['badge', tone === 'good' && 'badge-good', tone === 'bad' && 'badge-bad', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
