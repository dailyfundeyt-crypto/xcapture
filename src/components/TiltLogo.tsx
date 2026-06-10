import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

export function TiltLogo({ src, alt = "", className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rx = useSpring(useTransform(my, [-0.5, 0.5], [18, -18]), {
    stiffness: 150,
    damping: 15,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), {
    stiffness: 150,
    damping: 15,
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        perspective: 1000,
        rotateX: rx,
        rotateY: ry,
        transformStyle: "preserve-3d",
      }}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      <motion.img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full object-contain invert select-none"
        style={{
          filter:
            "drop-shadow(0 0 60px rgba(255,255,255,0.35)) drop-shadow(0 20px 40px rgba(255,255,255,0.15))",
          transform: "translateZ(40px)",
        }}
      />
    </motion.div>
  );
}
