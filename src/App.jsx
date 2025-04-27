import { useState } from "react";
import NavDropdown from "react-bootstrap/NavDropdown";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import HaplotypeNetworkApp from "./HaplotypeNetwork/HaplotypeNetworkApp";
import PhylotreeApplication from "./Phylotree/components/PhylotreeApplication";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

function DropdownLink(props) {
  return (
    <NavDropdown.Item as={Link} to={props.to}>
      {props.header}
    </NavDropdown.Item>
  );
}

function Navbar({
  onPhylotreeFileChange,
  onHaplotypeFileChange,
  phylotreeFileName,
  haplotypeFileName,
}) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">MEVP</div>
      <NavDropdown title="Tools">
        <DropdownLink to="/" header="Phylotree" />
        <DropdownLink to="#" header="Sequence Alignment" />
        <DropdownLink to="/haplotype" header="Haplotype Network" />
      </NavDropdown>

      <div className="file-upload">
        <NavDropdown title="File">
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {phylotreeFileName ? (
                <>
                  Current Newick:{" "}
                  <span className="file-name">{phylotreeFileName}</span>
                </>
              ) : (
                "Upload Newick"
              )}
              <input
                type="file"
                accept=".nwk"
                onChange={onPhylotreeFileChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>

          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {haplotypeFileName ? (
                <>
                  Current Fasta:{" "}
                  <span className="file-name">{haplotypeFileName}</span>
                </>
              ) : (
                "Upload Fasta"
              )}
              <input
                type="file"
                accept=".fa,.fasta,.txt"
                onChange={onHaplotypeFileChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>
        </NavDropdown>
      </div>
    </nav>
  );
}

function App() {
  const [phylotreeContent, setPhylotreeContent] = useState("");
  const [haplotypeContent, setHaplotypeContent] = useState("");
  const [phylotreeFileName, setPhylotreeFileName] = useState("");
  const [haplotypeFileName, setHaplotypeFileName] = useState("");

  const handlePhylotreeFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setPhylotreeFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhylotreeContent(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleHaplotypeFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setHaplotypeFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setHaplotypeContent(e.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <BrowserRouter>
      <div>
        <Navbar
          onPhylotreeFileChange={handlePhylotreeFileChange}
          onHaplotypeFileChange={handleHaplotypeFileChange}
          phylotreeFileName={phylotreeFileName}
          haplotypeFileName={haplotypeFileName}
        />
        <div className="container-fluid">
          <Routes>
            <Route
              path="/"
              element={
                <div style={{ maxWidth: 1140, margin: "0 auto" }}>
                  <PhylotreeApplication initialNewick={phylotreeContent} />
                </div>
              }
            />
            <Route
              path="/haplotype"
              element={
                <HaplotypeNetworkApp initialFileContent={haplotypeContent} />
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
