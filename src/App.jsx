import { useState } from "react";
import NavDropdown from "react-bootstrap/NavDropdown";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import * as XLSX from "xlsx";

import FloatingChatManager from "./Chat/FloatingChatManager";
import HaplotypeNetworkApp from "./HaplotypeNetwork/HaplotypeNetworkApp";
import PhylotreeApplication from "./Phylotree/PhylotreeApplication";
import SequencealignmentAPP from "./Sequence alignment/SequencealignmentAPP";

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
  haplotypeFiles,
  selectedHaplotypeIndex,
  setSelectedHaplotypeIndex,
  onEDnaSampleChange,
  onEDnaTagsChange,
  phylotreeFileName,
  eDnaSampleFileName,
  eDnaTagsFileName,
}) {
  return (
    <nav className="navbar">
      <img src="/MEVP_logo.png" alt="MEVP Logo" className="navbar-logo" />
      <NavDropdown title="Tools">
        <DropdownLink to="/" header="Phylotree" />
        <DropdownLink to="/sequence-alignment" header="Sequence Alignment" />
        <DropdownLink to="/haplotype" header="Haplotype Network" />
      </NavDropdown>

      <div className="file-upload">
        <NavDropdown title="File">
          {/* Upload Newick */}
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

          {/* Upload Fasta (Multiple) */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {haplotypeFiles.length > 0
                ? `Fasta Files: ${haplotypeFiles.length} uploaded`
                : " Upload Fasta (multiple)"}
              <input
                type="file"
                accept=".fa,.fasta,.txt"
                multiple
                onChange={onHaplotypeFileChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>

          {/* Select which fasta file to use */}
          {haplotypeFiles.length > 0 && (
            <NavDropdown
              title={
                haplotypeFiles[selectedHaplotypeIndex]?.name || "Select Fasta"}                                   
                style={{ marginLeft: "50px" }} 
            >
              {haplotypeFiles.map((file, idx) => (
                <NavDropdown.Item
                  key={idx}
                  onClick={() => setSelectedHaplotypeIndex(idx)}
                >
                  {file.name}
                </NavDropdown.Item>
              ))}
            </NavDropdown>
          )}

          {/* Upload eDNA Sample Station (XLSX) */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {eDnaSampleFileName ? (
                <>
                  Sample Station:{" "}
                  <span className="file-name">{eDnaSampleFileName}</span>
                </>
              ) : (
                "Upload eDNA Sample Station (XLSX)"
              )}
              <input
                type="file"
                accept=".xlsx"
                onChange={onEDnaSampleChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>

          {/* Upload eDNA Tags (XLSX) */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {eDnaTagsFileName ? (
                <>
                  Tags File:{" "}
                  <span className="file-name">{eDnaTagsFileName}</span>
                </>
              ) : (
                "Upload eDNA_tags__miseq-PE300 (XLSX)"
              )}
              <input
                type="file"
                accept=".xlsx"
                onChange={onEDnaTagsChange}
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
  const [phylotreeFileName, setPhylotreeFileName] = useState("");

  const [haplotypeFiles, setHaplotypeFiles] = useState([]); // [{name, content}]
  const [selectedHaplotypeIndex, setSelectedHaplotypeIndex] = useState(null);

  const [eDnaSampleContent, setEDnaSampleContent] = useState("");
  const [eDnaTagsContent, setEDnaTagsContent] = useState("");
  const [eDnaSampleFileName, setEDnaSampleFileName] = useState("");
  const [eDnaTagsFileName, setEDnaTagsFileName] = useState("");

  // Handle Newick
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

  // Handle multiple fasta upload
  const handleHaplotypeFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setHaplotypeFiles((prev) => [
          ...prev,
          { name: file.name, content: e.target.result },
        ]);

        if (selectedHaplotypeIndex === null) {
          setSelectedHaplotypeIndex(0);
        }
      };
      reader.readAsText(file);
    });
  };

  // Parse eDNA Sample Station
  const handleEDnaSampleChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setEDnaSampleFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      setEDnaSampleContent(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse eDNA Tags
  const handleEDnaTagsChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setEDnaTagsFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      setEDnaTagsContent(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <BrowserRouter>
      <div>
        <Navbar
          onPhylotreeFileChange={handlePhylotreeFileChange}
          onHaplotypeFileChange={handleHaplotypeFileChange}
          haplotypeFiles={haplotypeFiles}
          selectedHaplotypeIndex={selectedHaplotypeIndex}
          setSelectedHaplotypeIndex={setSelectedHaplotypeIndex}
          onEDnaSampleChange={handleEDnaSampleChange}
          onEDnaTagsChange={handleEDnaTagsChange}
          phylotreeFileName={phylotreeFileName}
          eDnaSampleFileName={eDnaSampleFileName}
          eDnaTagsFileName={eDnaTagsFileName}
        />
        <div className="container-fluid" id="workspace-container">
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
                <HaplotypeNetworkApp
                  initialFileContent={
                    selectedHaplotypeIndex !== null
                      ? haplotypeFiles[selectedHaplotypeIndex].content
                      : ""
                  }
                  initialFileName={
                    selectedHaplotypeIndex !== null
                      ? haplotypeFiles[selectedHaplotypeIndex].name
                      : ""
                  }
                  eDnaSampleContent={eDnaSampleContent}
                  eDnaTagsContent={eDnaTagsContent}
                />
              }
            />
            <Route
              path="/sequence-alignment"
              element={
                <SequencealignmentAPP
                  haplotypeContent={
                    selectedHaplotypeIndex !== null
                      ? haplotypeFiles[selectedHaplotypeIndex].content
                      : ""
                  }
                />
              }
            />
          </Routes>

          {/* Floating Chat Manager */}
          <FloatingChatManager />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
