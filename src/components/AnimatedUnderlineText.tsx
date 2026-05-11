import { forwardRef, type HTMLAttributes } from 'react'
import { motion, type Variants } from 'framer-motion'
import styles from './AnimatedUnderlineText.module.css'

interface AnimatedUnderlineTextProps extends HTMLAttributes<HTMLDivElement> {
  text: string
  textClassName?: string
  underlineClassName?: string
  underlinePath?: string
  underlineHoverPath?: string
  underlineDuration?: number
}

export const AnimatedUnderlineText = forwardRef<HTMLDivElement, AnimatedUnderlineTextProps>(
  (
    {
      text,
      textClassName,
      underlineClassName,
      underlinePath = 'M 0,10 Q 75,0 150,10 Q 225,20 300,10',
      underlineHoverPath = 'M 0,10 Q 75,20 150,10 Q 225,0 300,10',
      underlineDuration = 1.5,
      className,
      ...props
    },
    ref,
  ) => {
    const pathVariants: Variants = {
      hidden: {
        pathLength: 0,
        opacity: 0,
      },
      visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
          duration: underlineDuration,
          ease: 'easeInOut',
        },
      },
    }

    return (
      <div ref={ref} className={[styles.root, className].filter(Boolean).join(' ')} {...props}>
        <div className={styles.inner}>
          <motion.span
            className={[styles.text, textClassName].filter(Boolean).join(' ')}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            {text}
          </motion.span>

          <motion.svg
            width="100%"
            height="20"
            viewBox="0 0 300 20"
            className={[styles.underline, underlineClassName].filter(Boolean).join(' ')}
          >
            <motion.path
              d={underlinePath}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              variants={pathVariants}
              initial="hidden"
              animate="visible"
              whileHover={{
                d: underlineHoverPath,
                transition: { duration: 0.8 },
              }}
            />
          </motion.svg>
        </div>
      </div>
    )
  },
)

AnimatedUnderlineText.displayName = 'AnimatedUnderlineText'
