import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-[#00A76F]/12 text-[#007849]',
  className = '',
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-[rgba(145,158,171,0.16)] shadow-[0_0_2px_0_rgba(145,158,171,0.2),0_12px_24px_-4px_rgba(145,158,171,0.12)] flex items-center justify-between gap-3 sm:gap-4 ${className}`}
    >
      <div className="space-y-0.5 sm:space-y-1 min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-[#637381] truncate">{title}</p>
        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1C252E] tracking-tight font-mono truncate">{value}</p>
        {subtitle && <p className="text-[11px] sm:text-xs text-[#919EAB] font-medium truncate">{subtitle}</p>}
      </div>

      {Icon && (
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={18} className="sm:hidden" />
          <Icon size={22} className="hidden sm:block" />
        </div>
      )}
    </motion.div>
  );
}
