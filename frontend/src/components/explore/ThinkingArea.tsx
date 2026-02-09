"use client";

import { useState } from "react";
import ThoughtCapture from "./ThoughtCapture";
import ThinkingPrompts from "./ThinkingPrompts";

export default function ThinkingArea() {
    const [thought, setThought] = useState("");

    return (
        <div className="space-y-8">
            {/* Capture Section */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
                        ✨
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Start Thinking</h2>
                        <p className="text-xs text-gray-500">Capture a raw thought or confusing idea</p>
                    </div>
                </div>
                <ThoughtCapture content={thought} onChange={setThought} />
            </section>

            {/* Prompts Section */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg">
                        💡
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Thinking Prompts</h2>
                        <p className="text-xs text-gray-500">Kickstart your brain with these angles</p>
                    </div>
                </div>
                <ThinkingPrompts onSelect={(text) => setThought(text)} />
            </section>
        </div>
    );
}
