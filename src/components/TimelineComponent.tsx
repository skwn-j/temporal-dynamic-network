import React, { Component } from 'react'
import ProgressBar from 'react-bootstrap/ProgressBar';

class Timeline extends Component {
  state = {
      now: 50
  }
  
  render() {
    return <ProgressBar now={this.state.now} label={`${this.state.now}%`}/>
  }
}

export default Timeline