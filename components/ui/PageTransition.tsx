'use client'

import { motion, Transition } from 'framer-motion'
import { ReactNode } from 'react'

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  in: {
    opacity: 1,
    y: 0
  },
  out: {
    opacity: 0,
    y: -20
  }
}

const pageTransition: Transition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3
}

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}