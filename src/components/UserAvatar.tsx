import Tooltip from './Tooltip';
import { avatarColor, initialsOf } from '@/components/ui';

interface UserAvatarProps {
  name: string | null;
  email: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-9 h-9 text-sm'
};

export default function UserAvatar({ 
  name, 
  email, 
  size = 'md', 
  className = '',
  showTooltip = true
}: UserAvatarProps) {
  const initials = initialsOf(name, email);

  const fullName = name || email;

  const content = (
    <div 
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white ${avatarColor(email || name)} ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  );

  if (showTooltip) {
    return (
      <Tooltip content={fullName}>
        {content}
      </Tooltip>
    );
  }

  return content;
}