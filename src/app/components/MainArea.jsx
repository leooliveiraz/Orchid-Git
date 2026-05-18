import React, { useContext } from "react";
import NoDirectory from "./NoDirectory.jsx";
import { OrchidContext } from "../OrchidContext.jsx";
import Repository from "./Repository.jsx";
import RepositoryOld from "./RepositoryOld.jsx";

export default function MainArea({ children }) {
  const { directory, setDirectory } = useContext(OrchidContext);
  return (
    <div id="main-area" className="main-area">
      {!directory && <NoDirectory />}
      {directory && <Repository repositoryDirectory={directory} />}
    </div>
  );
}
