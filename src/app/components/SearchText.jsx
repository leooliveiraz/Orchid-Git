import React from "react";
import { TextField } from "@mui/material";
import { useState } from "react";

export default function SearchText(){
    const [text,setText] = useState("");

    function findByText(key){
        if(key === "Enter"){
            window.find(text)
        }
    }


    return <TextField id="outlined-basic" label="Search and press enter" variant="outlined" onChange={(e)=>{setText(e.target.value)}}  onKeyDown={(e)=>{findByText(e.key)}} />
}