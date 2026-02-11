"use client";

import { motion } from "framer-motion";
import React from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full"
        >
            {children}
        </motion.div>
    );
}
