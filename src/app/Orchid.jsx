import React, { useState } from "react";
import { OrchidContext } from "./OrchidContext.jsx";
import LeftMenu from "./components/LeftMenu.jsx";
import { Box } from "@mui/material";
import MainArea from "./components/MainArea.jsx";
import AppMenu from "./components/AppMenu.jsx";
export default function Orchid() {
  const [directory, setDirectory] = useState("/home/leo/Projects/mf");

  return (
    <>
      <OrchidContext.Provider value={{ directory, setDirectory }}>
        <Box sx={{ flexGrow: 1 }}>
          <AppMenu></AppMenu>
          <Box sx={{ display: "flex" }}>
            {/* <LeftMenu></LeftMenu> */}
            <MainArea>
              <h1>Orchid!</h1>
              <h2>Your git ui system</h2>
            </MainArea>
          </Box>
        </Box>
      </OrchidContext.Provider>
    </>
  );
}
