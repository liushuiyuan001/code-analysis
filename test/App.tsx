import { useState } from 'react';
import './App.css';
import Gantt from 'time-gantt';
import Index from './index'
import { data, XAXIS_ARR } from './data'

function App() {

  return (
    <div className="app">
      {/* <Gantt data={data}/> */}
      <div className="chart-container">
        <Index data={data} xAxisArr={XAXIS_ARR}/>
      </div>
    </div>
  )
}

export default App
