import React, { useState } from "react";
import { OrchidContext } from "./OrchidContext.jsx";
import LeftMenu from "./components/LeftMenu.jsx";
import { Box } from "@mui/material";
import MainArea from "./components/MainArea.jsx";
export default function Orchid() {
  const [directory, setDirectory] = useState("");



  return (
    <>
      <OrchidContext.Provider value={{directory,setDirectory}}>
        <Box sx={{ display: "flex" }}>
          <LeftMenu></LeftMenu>
          <MainArea>
            <h1>Orchid!</h1>
            <h2>Your git ui system</h2>
          </MainArea>
        </Box>
      </OrchidContext.Provider>
    </>
  );
}
