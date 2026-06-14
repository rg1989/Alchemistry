import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import type { AnimationItem } from 'lottie-web'

import cauldronData from '../assets/cauldron.json'

interface LottieCauldronProps {
  isBrewing?: boolean
}

export function LottieCauldron({ isBrewing = false }: LottieCauldronProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<AnimationItem | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: cauldronData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        viewBoxSize: '56 118 888 674',
      },
    })

    animationRef.current = animation

    return () => {
      animation.destroy()
      animationRef.current = null
    }
  }, [])

  useEffect(() => {
    animationRef.current?.setSpeed(isBrewing ? 1.9 : 1)
  }, [isBrewing])

  return <div ref={containerRef} className="cauldron-lottie" aria-hidden="true" />
}
