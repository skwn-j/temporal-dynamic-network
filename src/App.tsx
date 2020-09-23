import React from "react";
import * as d3 from 'd3';
import * as d3Force from 'd3-force';

import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from "react-bootstrap/Navbar";

import Network from "./components/NetworkComponent";
import Statistics from "./components/StatisticsComponent";
import Timeline from "./components/TimelineComponent";

import data from './data/filtered_trans.json';
import "./styles/App.css";

async function readFiles() {
  let csv = await d3.csv("./data/account.csv").then(function(data) {
    console.log(data); // [{"Hello": "world"}, …]
    return data
  });
  console.log(csv)
}

function App() {
  readFiles();
  // Data filtering
  let accountData = []
  let transData = Object.values(data).map((d: any) => {
  /*
  let accountId: string[] = []


    if(accountId.indexOf(d.from) >= 0) {
      let i : number = accountId.indexOf(d.from);
      accountData[i].balance = +d.from_balance;
    }
    else {
      accountId.push(d.from)
      accountData.push({
        id: d.from,
        balance: +d.from_balance
      })
    }

    if(accountId.indexOf(d.to) >= 0) {
      let i : number = accountId.indexOf(d.to);
      accountData[i].balance = +d.to_balance;
    }
    else {
      accountId.push(d.to)
      accountData.push({
        id: d.to,
        balance: +d.to_balance
      })
    }
    
    return {
      amount: +d.amount,
      source: d.from,
      source_balance: +d.from_balance,
      id: +d.id,
      k_symbol: d.k_symbol,
      operation: d.operation,
      target: d.to,
      target_balance: d.to_balance,
      type: d.type,
    }
  })
  */
  console.log(accountData)
  console.log(transData)
  
  return (
    <Container id="container" fluid={true}>
      <Navbar bg="primary" variant="dark" sticky="top">
        <Navbar.Brand href="#home">Navbar</Navbar.Brand>
      </Navbar>
      <Row>
        <Col id='network-cell' lg={9}>
          <Network accountData={accountData} transData={transData}></Network>
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
