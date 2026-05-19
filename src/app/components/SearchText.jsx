import React, { useEffect, useRef } from "react";
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useState } from "react";

export default function SearchText({ visible }){
    const [text,setText] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        if (visible) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [visible]);

    function findText(){
        if(text) window.find(text, false, false, true);
    }

    function findByText(key){
        if(key === "Enter") findText();
    }

    return (
        <TextField
            inputRef={inputRef}
            label="Search and press enter"
            variant="outlined"
            size="small"
            value={text}
            onChange={(e) => setText(e.target.value.trim())}
            onKeyDown={(e) => findByText(e.key)}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end" onClick={findText} style={{ cursor: "pointer" }}>  
                        <SearchIcon fontSize="small" />
                    </InputAdornment>
                )
            }}
            sx={{ width: 300 }}
        />
    );
}
