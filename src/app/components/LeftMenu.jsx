import { Button, Drawer } from "@mui/material";
import React, { useContext, useEffect } from "react";
import "./LeftMenu.css";
import { OrchidContext } from "../OrchidContext.jsx";

export default function LeftMenu() {
  const { directory, setDirectory } = useContext(OrchidContext);
  useEffect(() => {
    window.api.testReceive((e) => console.log(e));
  }, []);

  function searchDirectory() {
    window.api.testSend("sending");
    window.api.testInvoke("invoking").then((res) => {
      console.log(res);
    });
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
