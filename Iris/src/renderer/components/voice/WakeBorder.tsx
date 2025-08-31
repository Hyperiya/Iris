import React, { useState, useEffect } from "react";
import { logger } from "../../utils/logger.ts";
import "./styles/WakeBorder.scss"

const WakeBorder: React.FC = ({}) => {
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        window.irisVA.onWaiting(() => {
            logger.log("Waiting event received in UI");
            setIsListening(true)
            // Update UI - show waiting indicator, change colors, etc.
        });

        window.irisVA.onReset(() => {
            logger.log("Reset event received in UI");
            setIsListening(false)
            // Update UI - show listening indicator
        });

        window.irisVA.onCommand(() => {
            logger.log("Command received in UI");
            setIsListening(false)
            // Update UI - show command feedback
        });
    }, []);

    return (
        <>
            <div className={`fullscreen-border ${isListening ? "listening" : ""}`} />
        </>
    );
};

export default WakeBorder;
