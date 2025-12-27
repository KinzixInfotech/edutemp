'use client';
import { motion } from 'motion/react';

const ScrollMouse = ({ className = "" }) => {
    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div className="w-[26px] h-[42px] rounded-[15px] border-[2px] border-black flex justify-center pt-[6px] bg-white/20 backdrop-blur-[2px]">
                <motion.div
                    className="w-[3px] h-[6px] bg-black rounded-full"
                    animate={{
                        y: [0, 12],
                        opacity: [1, 0]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 0.2,
                        ease: "easeOut"
                    }}
                />
            </div>
        </div>
    );
}

export default ScrollMouse;
