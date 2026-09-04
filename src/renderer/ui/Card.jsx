export default function Card({ hover = false, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={['card', hover && 'card-hover', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
