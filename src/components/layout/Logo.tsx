
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const textSizeClass = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl';
  const iconSize = size === 'lg' ? 30 : size === 'md' ? 24 : 20;

  return (
    <Link href="/" className="flex items-center gap-2 group">
      <GraduationCap className={`text-primary group-hover:text-primary/80 transition-colors`} size={iconSize} />
      <span className={`font-bold ${textSizeClass} text-foreground group-hover:text-foreground/80 transition-colors`}>
        Skill Stream
      </span>
    </Link>
  );
};

export default Logo;