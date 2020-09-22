import React, { Component } from "react";
import * as d3 from "d3";

let svgWidth: number = 1000;
let svgHeight: number = 800;
const margin = { left: 40, right: 10, top: 10, bottom: 20 };
const height = svgHeight - margin.bottom - margin.top;
const width = svgWidth - margin.left - margin.right;

interface NetworkProps {}

interface NetworkState {
  isLoaded: boolean;
}

const translate = (x: number, y: number): string => {
  return "translate(" + x + "," + y + ")";
};

class Network extends Component<NetworkProps, NetworkState> {
  svg: any;
  network: any;
  xAxis: any;
  yAxis: any;

  state: NetworkState = {
    isLoaded: false,
  };

  initNetwork = () => {
    this.network = d3
      .select(this.svg)
      .append("g")
      .attr("height", height)
      .attr("width", width)
      .attr("class", "network")
      .attr("transform", translate(margin.left, margin.top));

    this.xAxis = this.network
      .append("g")
      .attr("class", "xAxis")
      .attr("transform", translate(0, height));
    this.yAxis = this.network.append("g").attr("class", "yAxis");

  };
  updateNetwork = () => {
    
  };

  componentDidMount() {
    this.initNetwork();
    this.setState({
      isLoaded: true,
    });
  }

  componentDidUpdate() {}

  render() {
    if (this.state.isLoaded) {
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
    } else {
      return <p> Loading </p>;
    }
  }
}

export default Network;
