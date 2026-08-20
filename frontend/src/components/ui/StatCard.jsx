import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-brand-50 text-brand-600 border border-brand-100',
  className = '',
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-card hover:shadow-card-hover flex items-center justify-between gap-4 ${className}`}
    >
      <div className="space-y-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono truncate">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>}
      </div>

      {Icon && (
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={22} />
        </div>
      )}
    </motion.div>
  );
}
