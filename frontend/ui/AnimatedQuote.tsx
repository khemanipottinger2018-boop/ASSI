'use client';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface AnimatedQuoteProps {
    text: string;
    className?: string;
    onComplete?: () => void;
}

export default function AnimatedQuote({
    text, 
    className = '',
    onComplete
}: AnimatedQuoteProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete?.();
        }, 4000);
        
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className={`text-lg text-gray-600 text-center max-w-2xl mx-auto ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            "{text}"
        </motion.div>
    );
}