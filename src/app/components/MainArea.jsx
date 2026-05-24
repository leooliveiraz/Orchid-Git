import React, { useContext } from "react";
import NoDirectory from "./NoDirectory.jsx";
import NotRepoWarning from "./NotRepoWarning.jsx";
import { OrchidContext } from "../OrchidContext.jsx";
import Repository from "./Repository.jsx";

export default function MainArea() {
  const { directory, notRepo } = useContext(OrchidContext);
  return (
    <div id="main-area" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {!directory && <NoDirectory />}
      {directory && notRepo === true && <NotRepoWarning />}
      {directory && notRepo === false && <Repository repositoryDirectory={directory} />}
    </div>
  );
}
