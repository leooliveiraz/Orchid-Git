import React, { useEffect, useRef } from "react";
import { TextField } from "@mui/material";
import { useState } from "react";

export default function SearchText(){
    const [text,setText] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        function handler(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        }
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    function findByText(key){
        if(key === "Enter"){
            window.find(text, false, false, true)
        }
    }

    return <TextField inputRef={inputRef} id="outlined-basic" label="Search and press enter" variant="outlined" onChange={(e)=>{setText(e.target.value.trim())}}  onKeyDown={(e)=>{findByText(e.key)}} />
}
