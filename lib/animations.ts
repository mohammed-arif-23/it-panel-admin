// Animation variants for Framer Motion
// Centralized animation configuration for consistent transitions

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
}

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as any }
}

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as any }
}

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as any }
}

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as any }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as any }
}

export const scaleOut = {
  initial: { scale: 1 },
  animate: { scale: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { duration: 0.2 }
}

export const bounceIn = {
  initial: { opacity: 0, scale: 0.3 },
  animate: { 
    opacity: 1, 
    scale: [0.3, 1.1, 0.9, 1],
  },
  transition: { 
    duration: 0.5,
    times: [0, 0.6, 0.8, 1]
  }
}

export const cardHover = {
  scale: 1.02,
  y: -4,
  transition: { duration: 0.2 }
}

export const cardTap = {
  scale: 0.98,
  transition: { duration: 0.1 }
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
}

// Page transitions
export const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as any }
}

// Modal animations
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
}

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as any }
}

// Success celebration
export const successCelebration = {
  initial: { scale: 0 },
  animate: { 
    scale: [0, 1.2, 1],
    rotate: [0, 10, -10, 0]
  },
  transition: { 
    duration: 0.6,
    times: [0, 0.5, 1]
  }
}

// Notification slide in
export const notificationSlide = {
  initial: { x: 300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 300, opacity: 0 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as any }
}

// Loading pulse
export const loadingPulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.5, 1, 0.5]
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: [0.4, 0, 0.6, 1] as any
  }
}
