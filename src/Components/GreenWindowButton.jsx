import React from "react";
import { Button } from "react-bootstrap";
import { GreenWindow } from "../Components/GreenWindow";

export const GreenWindowButton = ({ showGreenWindow, setShowGreenWindow }) => {
    return (
        <>
            <button
                onClick={() => setShowGreenWindow(!showGreenWindow)}
                className="btn btn-tr fw-bold text-success"
            >
                Open Green Screen
            </button>

            {
                showGreenWindow &&
                <GreenWindow >
                    <h1>Green Screen:</h1>
                    <p>Even though I render in a different window, I share state!</p>

                    <button >Close me!</button>
                </GreenWindow>


            }
        </>
    );
};

export default GreenWindowButton;
