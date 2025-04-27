import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import RBNavbar from "react-bootstrap/Navbar";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

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

function Navbar() {
  return (
    <RBNavbar bg="light">
      <RBNavbar.Brand>MEVP</RBNavbar.Brand>
      <Nav className="mr-auto">
        <NavDropdown title="Tools">
          <DropdownLink to="/" header="Phylotree" />
          <DropdownLink to="#" header="Sequence Alignment" />
          <DropdownLink to="#" header="Haplotype Network" />
        </NavDropdown>
      </Nav>
    </RBNavbar>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div>
        <Navbar />
        <div style={{ maxWidth: 1140 }} className="container-fluid">
          <Routes>
            <Route path="/" element={<PhylotreeApplication />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
