import { Button, Drawer } from "@mui/material";
import React, { useContext, useEffect } from "react";
import "./LeftMenu.css";
import { OrchidContext } from "../OrchidContext.jsx";

export default function LeftMenu() {
  const { directory, setDirectory } = useContext(OrchidContext);
  useEffect(() => {
    //test receiving
    window.api.testReceive((e) => console.debug(e));
  }, []);

  function searchDirectory() {
    //test
    window.api.testSend("sending");
    window.api.testInvoke("invoking").then((res) => {
      console.debug(res);
    });


    window.api.selectDirectory("").then((data) => {
      if(!data.canceled){
        const path = data.filePaths[0];
        setDirectory(path)
      }
    })
  }

  return (
    <Drawer id="left-menu" className="left-menu" variant="permanent">
      <Button
        onClick={() => {
          searchDirectory();
        }}
      >
        Select a directory
      </Button>
      <label>{directory}</label>
    </Drawer>
  );
}
