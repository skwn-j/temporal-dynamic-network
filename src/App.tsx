import React from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

import Network from "./components/NetworkComponent";
import Statistics from "./components/StatisticsComponent";
import Timeline from "./components/TimelineComponent";

import "./styles/App.css";

function App() {

  return (
    <Container id="container" fluid={true}>
      <Navbar bg="primary" variant="dark" sticky="top">
        <Navbar.Brand href="#home">Navbar</Navbar.Brand>
      </Navbar>
      <Row>
        <Col id='network-cell' lg={9}>
          <Network></Network>
        </Col>
        <Col id='statistics-cell' lg={3}>
          <Statistics></Statistics>
        </Col>
      </Row>
      <Row>
        <Col id='timeline-cell'>
          <Timeline></Timeline>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
