import React, { Component } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from "react-bootstrap/Navbar";
import Button from 'react-bootstrap/Button';
import ProgressBar from 'react-bootstrap/ProgressBar';

import Network from "./components/NetworkComponent";
import Statistics from "./components/StatisticsComponent";
import Timeline from "./components/TimelineComponent";

import transCSV from './data/filtered_real.json';
import accountCSV from './data/accounts.json';

import "./styles/App.css";
import { idText } from "typescript";


/*
async function readFiles() {
  let csv = await d3.csv("./data/account.csv").then(function(data) {
    console.log(data); // [{"Hello": "world"}, …]
    return data
  });
  console.log(csv)
  
}
*/

export interface Account {
  id: string;
  balance: number | null;
  date: number | null;
  frequency: string;
  district: number;
}

export interface Transaction {
  amount: number;
  from: string;
  from_balance: number | null;
  id: number;
  k_symbol: string | null;
  operation: string | null;
  to: string;
  to_balance: number | null;
  type: string;
  date: number;
}
interface AppProps {

}
interface AppState {
  now: number;
  accountData: Account[];
  transData: Transaction[];
  date: string | undefined;
}

function preprocessTrans(start: number, end: number) {
  //console.log(start)
  let transFull: Transaction[] = Object.values(transCSV).map(d => {
    //console.log('19'+d.date.slice(0, 2) + '-'+d.date.slice(2, 4) + '-' + d.date.slice(4))
    return {
      amount: +d.amount,
      from: d.from,
      from_balance: d.from_balance === null ? null : +d.from_balance!,
      id: +d.id,
      k_symbol: d.k_symbol,
      operation: d.operation,
      to: d.to,
      to_balance: d.to_balance === null ? null : +d.to_balance!,
      type: d.type,
      date: Date.parse('19'+d.date.slice(0, 2) + '-'+d.date.slice(2, 4) + '-' + d.date.slice(4)),
    }
  });

  let transSorted = transFull.sort((a: Transaction, b: Transaction) : number => {
    return - b.date + a.date
  }).filter(d => (start <= d.date && d.date <= end))
  return transSorted;
}
function preprocessAccount(transData: Transaction[]) {
  let accountIds: string[] = [];
  let accountData: Account[] = [];
  //console.log(accountCSV)
  let accountFull: Account[] = Object.values(accountCSV).map(d => {
    return {
      id: d.id,
      balance: null,
      date: d.date === null ? null : Date.parse('19'+d.date!.slice(0, 2) + '-'+d.date!.slice(2, 4) + '-' + d.date!.slice(4)),
      frequency: d.frequency,
      district: d.district,
    }
  });

  transData.forEach((d:Transaction) => {
    if(accountIds.includes(d.from)) {
      let i: number = accountIds.indexOf(d.from);
      if(d.from_balance != null) {
        accountData[i].balance = d.from_balance;
      }
    }
    else {
      accountIds.push(d.from);
      let acc: Account = accountFull.find(acc => acc.id == d.from)!;
      if(d.from_balance != null) {
        acc.balance = d.from_balance;
      }
      accountData.push(acc);
    }
     
    if(accountIds.includes(d.to)) {
      let i: number = accountIds.indexOf(d.to);
      if(d.to_balance != null) {
        accountData[i].balance = d.to_balance;
      }
    }
    else {
      accountIds.push(d.to);
      let acc: Account = accountFull.find(acc => acc.id == d.to)!;
      if(d.to_balance != null) {
        acc.balance = d.to_balance;
      }
      accountData.push(acc);
    }
  })

  return accountData

}


class App extends Component<AppProps, AppState> {
  // Data filtering
  

  constructor(props: AppProps) {
    super(props);
    
    this.state = {
      now: 0,
      accountData: [],
      transData: [],
      date: '1995-12-01',
    }
    this.run = this.run.bind(this)
  }
  

  componentDidMount(){
    console.log('mount')
    console.log(this.state)
  }

  run() {
    console.log(this.state)
    this.setState({
      date: this.state.date + '1'
    })
  }


  render () {
    let start: number = Date.parse('1995-12-01')
    let end: number = Date.parse('1995-12-31')
    let transData: Transaction[] = preprocessTrans(start, end);
    let accountData: Account[] = preprocessAccount(transData);
    console.log(this.state)
    return (
      <Container id="container" fluid={true}>
        <Navbar bg="primary" variant="dark" sticky="top">
          <Navbar.Brand href="#home">Navbar</Navbar.Brand>
          <Button onClick={this.run}>
            run
          </Button>
        </Navbar>
        <Row>
          <Col id='network-cell' lg={9}>
            {this.state.date != undefined ? 
            <Network accountData={accountData} transData={transData} date={this.state.date}></Network>
            : <p> loading </p> }
          </Col>
          <Col id='statistics-cell' lg={3}>
            <Statistics></Statistics>
          </Col>
        </Row>
        <Row>
          <Col id='timeline-cell'>
            <ProgressBar now={this.state.now} label={`${this.state.now}%` }/>
          </Col>
        </Row>
      </Container>
    );
  }
}
  

export default App;
