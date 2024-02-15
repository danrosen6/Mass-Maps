import React, { useEffect, useState } from "react";
import getUserInfo from '../../utilities/decodeJwt';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar'; // Corrected component name
import "./navbar.css";

export default function NavbarComponent() { // Renamed to avoid naming conflict
  const [user, setUser] = useState({})

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  return (
    <Navbar className="navbar-container" sticky="top"> {/* Applied CSS class and sticky prop */}
      <Container>
        <Nav>
          <Nav.Link className="nav-link" href="/">Start</Nav.Link>
          <Nav.Link className="nav-link" href="/home">Home</Nav.Link>
          <Nav.Link className="nav-link" href="/privateUserProfile">Profile</Nav.Link>
          <Nav.Link className = "nav-link" href="/liveMap">Live Map</Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
}
