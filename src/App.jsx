import NavDropdown from "react-bootstrap/NavDropdown";
// import RBNavbar from "react-bootstrap/Navbar";
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

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">MEVP</div>
      <NavDropdown title="Tools">
        <DropdownLink to="/" header="Phylotree" />
        <DropdownLink to="#" header="Sequence Alignment" />
        <DropdownLink to="/haplotype" header="Haplotype Network" />
      </NavDropdown>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div>
        <Navbar />
        <div className="container-fluid">
          <Routes>
            <Route
              path="/"
              element={
                <div style={{ maxWidth: 1140, margin: "0 auto" }}>
                  <PhylotreeApplication />
                </div>
              }
            />
            <Route path="/haplotype" element={<HaplotypeNetworkApp />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
