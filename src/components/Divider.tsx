'use client';

import { motion } from 'framer-motion';

export default function Divider() {
  return (
    <motion.div
      className="h-[2px] bg-ac-red"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      style={{ transformOrigin: 'left' }}
    />
  );
}
