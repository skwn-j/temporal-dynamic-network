import React, { Component } from "react";
import * as d3 from "d3";
import * as d3Force from "d3-force";

let svgWidth: number = 1000;
let svgHeight: number = 800;
const margin = { left: 40, right: 10, top: 10, bottom: 20 };
const height = svgHeight - margin.bottom - margin.top;
const width = svgWidth - margin.left - margin.right;

interface NetNode extends d3Force.SimulationNodeDatum {
  id: string;
  balance: number;
}

interface NetLink extends d3Force.SimulationLinkDatum<NetNode> {
  amount: number;
  from: string;
  from_balance: number | null;
  id: number;
  k_symbol: string | null;
  operation: string | null;
  to: string;
  to_balance: string | null;
  type: string;
  date: string;
}

interface NetworkProps {
  accountData: Account[];
  transData: Transaction[];
}

interface NetworkState {
  selected: string | undefined;
  nodes: NetNode[];
  links: NetLink[];
}

const translate = (x: number, y: number): string => {
  return "translate(" + x + "," + y + ")";
};

class Network extends Component<NetworkProps, NetworkState> {
  svg: any = React.createRef();
  network: any;

  initNetwork = () => {
    console.log("init");
    this.network = d3
      .select(this.svg)
      .append("g")
      .attr("height", height)
      .attr("width", width)
      .attr("class", "network")
      .attr("transform", translate(margin.left, margin.top));
  };

  updateNetwork = () => {
    let forceLink: d3Force.ForceLink<Account, Transaction> = d3Force.forceLink(
      this.props.transData
    );
    let forceType: d3Force.ForceManyBody<Account> = d3.forceManyBody()
    const simulation = d3
      .forceSimulation(this.props.accountData)
      .force(
        "link",
        forceLink.id((d) => {
          return d.id;
        })
        .strength((d:Transaction) => {
          return d.amount/10000
        })
      )
      .force("charge", forceType)
      .force("center", d3.forceCenter(width / 2, height / 2));

    const nodes = this.network
      .selectAll(".node")
      .data(this.props.accountData)
      .join("circle")
      .attr("class", "node")
      .attr("r", 2)
      .attr("fill", "black");

    const links = this.network
      .selectAll(".link")
      .data(this.props.transData)
      .join("line")
      .attr('stroke', 'black')
      .attr("stroke-width", 1);

    simulation.on("tick", () => {
      links
        .attr("x1", (d: Transaction) => d.source.x)
        .attr("y1", (d: Transaction) => d.source.y)
        .attr("x2", (d: Transaction) => d.target.x)
        .attr("y2", (d: Transaction) => d.target.y);

      nodes.attr("cx", (d: Account) => d.x).attr("cy", (d: Account) => d.y);
    });
  };

  componentDidMount() {
    this.initNetwork();
    this.updateNetwork();
  }

  componentDidUpdate() {
    this.updateNetwork();
  }

  render() {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "scroll" }}>
        <svg
          id="network-svg"
          ref={(el) => (this.svg = el)}
          height={svgHeight}
          width={svgWidth}
        ></svg>
      </div>
    );
  }
}

export default Network;
