function Icon({ icon: IconComponent, size = 18, strokeWidth = 1.75, ...props }) {
  if (!IconComponent) return null;
  return <IconComponent size={size} strokeWidth={strokeWidth} {...props} />;
}

export default Icon;
