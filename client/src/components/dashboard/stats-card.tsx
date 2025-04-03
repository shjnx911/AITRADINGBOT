import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  icon: ReactNode;
  iconBgClass?: string;
  rightContent?: ReactNode;
}

export default function StatsCard({
  title,
  value,
  change,
  subtitle,
  icon,
  iconBgClass = "bg-blue-500/10 text-blue-500",
  rightContent
}: StatsCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <h3 className="text-2xl font-bold font-mono">{value}</h3>
        </div>
        <div className={`rounded-full ${iconBgClass} p-2`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center justify-between">
        {change && (
          <div className="flex items-center">
            <span className={`text-sm flex items-center ${
              change.isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {change.isPositive ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                  <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.53.919l-1.28 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                  <path fillRule="evenodd" d="M1.22 5.222a.75.75 0 011.06 0L7 9.942l3.768-3.769a.75.75 0 011.113.058 20.908 20.908 0 013.813 7.254l1.574-2.727a.75.75 0 011.3.75l-2.475 4.286a.75.75 0 01-.966.345l-4.287-2.475a.75.75 0 01.75-1.3l2.71 1.565a19.422 19.422 0 00-3.013-6.024L7.53 11.533a.75.75 0 01-1.06 0l-5.25-5.25a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              )}
              {change.value}
            </span>
            {subtitle && <span className="text-xs text-slate-400 ml-2">{subtitle}</span>}
          </div>
        )}
        
        {rightContent && (
          <div>{rightContent}</div>
        )}
      </div>
    </div>
  );
}
