import React, { useContext } from "react";
import NoDirectory from "./NoDirectory.jsx";
import { OrchidContext } from "../OrchidContext.jsx";
import Repository from "./Repository.jsx";

export default function MainArea() {
  const { directory } = useContext(OrchidContext);
  return (
    <div id="main-area" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {!directory && <NoDirectory />}
      {directory && <Repository repositoryDirectory={directory} />}
    </div>
  );
}
