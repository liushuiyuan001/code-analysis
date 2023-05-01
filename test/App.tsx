import { useState } from 'react';
import { cloneDeep as clone } from 'lodash-es';
import { data, XAXIS_ARR } from './data'
import * as parse from '@babel/parse';
import Gantt from 'time-gantt';
import Index from './index'
import './App.css';

function App() {

  const [count, setCount] = useState(1)
  document.getElementById('app').innerHTML = count
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