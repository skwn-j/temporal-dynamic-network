import React, { Component } from 'react'
import * as d3 from 'd3'
import * as d3Force from 'd3-force'
import { Account, Transaction } from '../App'

let svgWidth: number = 1000
let svgHeight: number = 800
const margin = { left: 40, right: 10, top: 10, bottom: 20 }
const height = svgHeight - margin.bottom - margin.top
const width = svgWidth - margin.left - margin.right

interface NetNode extends d3Force.SimulationNodeDatum, Account {}
interface NetLink extends d3Force.SimulationLinkDatum<NetNode>, Transaction {
    source: string | number | NetNode
    target: string | number | NetNode
}

interface NetworkProps {
    accountData: Account[]
    transData: Transaction[]
    date: string
}

interface NetworkState {
    nodes: NetNode[]
    links: NetLink[]
    selected: string[]
}

const translate = (x: number, y: number): string => {
    return 'translate(' + x + ',' + y + ')'
}

class Network extends Component<NetworkProps, NetworkState> {
    svg: any = React.createRef()
    simulation: d3Force.Simulation<NetNode, NetLink> = d3.forceSimulation()
    network: any

    constructor(props: NetworkProps) {
        super(props)

        this.state = {
            nodes: [],
            links: [],
            selected: [],
        }
    }

    initNetwork = () => {
        console.log('init')
        this.network = d3
            .select(this.svg)
            .append('g')
            .attr('height', height)
            .attr('width', width)
            .attr('class', 'network')
            .attr('transform', translate(margin.left, margin.top))
    }

    updateNetwork = () => {
        // node data setting
        console.log('update')
        const nodes: NetNode[] = this.props.accountData
        const links: NetLink[] = this.props.transData.map((d) => {
            return Object.assign(d, { source: d.from, target: d.to })
        })

        const forceLink: d3Force.ForceLink<
            NetNode,
            NetLink
        > = d3Force.forceLink(links)

        const forceMB: d3Force.ForceManyBody<NetNode> = d3Force.forceManyBody()

        this.simulation = d3Force
            .forceSimulation(nodes)
            .force(
                'link',
                forceLink.id((d) => d.id).strength(1)
            )
            .force('charge', forceMB.strength(-1))
            //.force("collide", d3.forceCollide())
            .force('center', d3.forceCenter(width / 2, height / 2))
        //.force("forceX", d3.forceX())
        //.force("forceY", d3.forceY());
        const link = this.network
            .selectAll('.link')
            .data(links)
            .join('line')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)

        const node = this.network
            .selectAll('.node')
            .data(nodes)
            .join('circle')
            .attr('r', 4)
            .attr('fill', 'black')
            .on('click', (e: MouseEvent, d: NetNode) => {
                console.log(e)
                console.log(d)
                let temp = this.state.selected
                temp.push(d.id)
                this.setState({
                    selected: temp,
                })
                this.simulation.restart()
            })
            .call(this.drag)

        this.simulation.on('tick', () => {
            link.attr('x1', (d: any) => {
                if (this.state.selected.includes(d.from)) {
                  let i: number = this.state.selected.indexOf(d.from);
                  return width / (this.state.selected.length+1) * (i+1);
                } else {
                    return d.source.x
                }
              })
              .attr('y1', (d: any) => {
                if (this.state.selected.includes(d.from)) {
                  let i: number = this.state.selected.indexOf(d.from);
                    return height / 2 // (this.state.selected.length+1) * (i+1);
                } else {
                    return d.source.y
                }
              })
              .attr('x2', (d: any) => {
                if (this.state.selected.includes(d.to)) {
                  let i: number = this.state.selected.indexOf(d.to);
                  return width / (this.state.selected.length+1) * (i+1);
                } else {
                    return d.target.x
                }
              })
              .attr('y2', (d: any) => {
                if (this.state.selected.includes(d.to)) {
                  let i: number = this.state.selected.indexOf(d.to);
                  return height / 2 //(this.state.selected.length+1) * (i+1);
                } else {
                    return d.target.y
                }
              })

            node.attr('cx', (d: any) => {
                if (this.state.selected.includes(d.id)) {
                  let i: number = this.state.selected.indexOf(d.id);
                  return width / (this.state.selected.length+1) * (i+1);
                } else {
                    return d.x
                }
            }).attr('cy', (d: any) => {
                if (this.state.selected.includes(d.id)) {
                  let i: number = this.state.selected.indexOf(d.id);
                  return height / 2 //(this.state.selected.length+1) * (i+1);
                } else {
                    return d.y
                }
            })
        })
    }

    dragstarted(event: any) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
    }

    dragged(event: any) {
        event.subject.fx = event.x
        event.subject.fy = event.y
    }

    dragended(event: any) {
        if (!event.active) this.simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
    }

    drag = d3
        .drag()
        .on('start', (e) => this.dragstarted(e))
        .on('drag', (e) => this.dragged(e))
        .on('end', (e) => this.dragended(e))

    handleNodeClick(d: NetNode) {
        console.log(this)
        console.log(d)

        //d.fx = width / 2;
        //d.fy = height / 2;
    }

    componentDidMount() {
        this.initNetwork()
        this.updateNetwork()
    }

    componentDidUpdate() {
        //this.updateNetwork()
    }

    render() {
        return (
            <div style={{ width: '100%', height: '100%', overflow: 'scroll' }}>
                <svg
                    id="network-svg"
                    ref={(el) => (this.svg = el)}
                    height={svgHeight}
                    width={svgWidth}
                ></svg>
            </div>
        )
    }
}

export default Network
