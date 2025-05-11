import React, { useEffect, useState } from "react";
import { OrchidContext } from "./OrchidContext.jsx";
import LeftMenu from "./components/LeftMenu.jsx";
import { Box } from "@mui/material";
import MainArea from "./components/MainArea.jsx";
import AppMenu from "./components/AppMenu.jsx";
export default function Orchid() {
  const [directory, setDirectory] = useState("/home/leo/Projects/mf");

  useEffect(() => {
    function keyDown(e) {
      let charStr,
        key = e.which || e.keyCode;
      if (key >= 112 && key <= 123) {
        e.preventDefault();
        e.stopPropagation();
        charStr = "F" + (key - 111);
        if (charStr === "F12") {
          window.api?.openDevTools();
        }
      }
    }
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
    };
  }, []);

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
