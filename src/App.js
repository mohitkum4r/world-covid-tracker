import './App.css';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import codes from './code';
import { matchSorter } from 'match-sorter';
import styled from 'styled-components';
import { useTable, usePagination, useSortBy, useFilters, useGlobalFilter } from 'react-table';
const WorldMap = require('react-svg-worldmap').WorldMap;


let globalTotalCases = 0
let globalTotalCasualties = 0
let globalActiveCases = 0
let globalRecoveriesSoFar = 0
let globalNewCases = 0
let globalNewCasualties = 0

const Styles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
    }
  }

  .pagination {
    padding: 0.5rem;
  }
`

// Defining an UI for filtering
function DefaultColumnFilter({
  column: { filterValue, preFilteredRows, setFilter },
}) {
  const count = preFilteredRows.length
  

  return (
    <input
      value={filterValue || localStorage.getItem("filter") || ""}
      onChange={e => {
        localStorage.setItem("filter", e.target.value)
        setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
      }}
      placeholder={`Search ${count} records...`}
    />
  )
}



function fuzzyTextFilterFn(rows, id, filterValue) {
  return matchSorter(rows, filterValue, { keys: [row => row.values[id]] })
}

// Let the table remove the filter if the string is empty
fuzzyTextFilterFn.autoRemove = val => !val



function Table({ columns, data }) {
  const filterTypes = React.useMemo(
    () => ({
      // Add a new fuzzyTextFilterFn filter type.
      fuzzyText: fuzzyTextFilterFn,
      // Or, override the default text filter to use
      // "startWith"
      text: (rows, id, filterValue) => {
        return rows.filter(row => {
          const rowValue = row.values[id]
          return rowValue !== undefined
            ? String(rowValue)
              .toLowerCase()
              .startsWith(String(filterValue).toLowerCase())
            : true
        })
      },
    }),
    []
  )

  const defaultColumn = React.useMemo(
    () => ({
      // Let's set up our default Filter UI
      Filter: DefaultColumnFilter,
    }),
    []
  )

  // Use the state and functions returned from useTable to build your UI
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page, // Instead of using 'rows', we'll use page,
    // which has only the rows for the active page

    // The rest of these things are super handy, too ;)
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 20, pageIndex: 0, sortBy: [{ id: "cases.new", desc: true }] },
      defaultColumn, // Be sure to pass the defaultColumn option
      filterTypes,
      // columns.country.disableFilters:false
    },

    useFilters, // useFilters!
    useGlobalFilter,
    useSortBy,
    usePagination

  )

  return (
    <>

      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                  <div id="filter">{column.canFilter ? column.render('Filter') : null}</div>
                </th>
              ))}
            </tr>
          ))}

        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* 
        Pagination can be built however you'd like. 
        This is just a very basic UI implementation:
      */}
      <div className="pagination">
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>{' '}
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>{' '}
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>{' '}
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={0}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              gotoPage(page)
            }}
            style={{ width: '100px' }}
          />
        </span>{' '}
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}


//let p = document.getElementById("filter").getElementsByTagName("input");


function App() {
  const [dat, setDat] = useState([]);
  const [tdat, setTdat] = useState([]);
  const [card, setCard] = useState({});



  useEffect(() => {

    var options = {
      method: 'GET',
      url: 'https://covid-193.p.rapidapi.com/statistics',
      headers: {
        'x-rapidapi-host': 'covid-193.p.rapidapi.com',
        'x-rapidapi-key': '1ed8aff3b9msh135d3f4e9bff821p1d5d1fjsna917fc9bd03e'
      }
    };


    axios.request(options).then(function (response) {
      let a = []
      setTdat(response.data.response)

      for (let d of response.data.response) {
        if (codes[d.country]) {
          a.push({ country: codes[d.country], value: d.cases.new })
        }
      }


      for (let e of response.data.response) {
        if (e.continent === "All") {

          globalTotalCases += parseInt(e.cases.total)
          globalTotalCasualties += e.deaths.total
          globalActiveCases += e.cases.active
          globalRecoveriesSoFar += e.cases.recovered
          let globalNewCasesString = e.cases.new
          if (globalNewCasesString != null) {
            globalNewCases += parseInt(globalNewCasesString.replace("+", ""))
          }
          let globalNewCasualtiesString = e.deaths.new
          if (globalNewCasualtiesString != null) {
            globalNewCasualties += parseInt(globalNewCasualtiesString.replace("+", ""))
          }
        }

      }
      setDat(a)
      setCard({ globalTotalCases: globalTotalCases.toLocaleString(), globalActiveCases: globalActiveCases.toLocaleString(), globalRecoveriesSoFar: globalRecoveriesSoFar.toLocaleString(), globalTotalCasualties: globalTotalCasualties.toLocaleString(), globalNewCases: globalNewCases.toLocaleString(), globalNewCasualties: globalNewCasualties.toLocaleString() })


    }).catch(function (error) {
      console.error(error);
    });

  }, []);

  let columns = React.useMemo(
    () => [
      {
        Header: 'Country/Continent',
        accessor: "country",
        disableFilters: false
      },
      {
        Header: 'Total Cases',
        accessor: "cases.total",
        disableFilters: true
      },
      {
        Header: 'New Cases',
        accessor: "cases.new",
        disableFilters: true
      },
      {
        Header: 'Total Deaths',
        accessor: "deaths.total",
        disableFilters: true
      },
      {
        Header: 'New Deaths',
        accessor: "deaths.new",
        disableFilters: true
      },
      {
        Header: 'Active',
        accessor: "cases.active",
        disableFilters: true
      },
      {
        Header: 'Crtical',
        accessor: "cases.critical",
        disableFilters: true
      },
      {
        Header: 'Recovered',
        accessor: "cases.recovered",
        filter: 'fuzzyText',
        disableFilters: true
      },
      {
        Header: 'Cases/1M',
        accessor: "cases.1M_pop",
        filter: 'fuzzyText',
        disableFilters: true
      },
      {
        Header: 'Deaths/1M',
        accessor: "deaths.1M_pop",
        filter: 'fuzzyText',
        disableFilters: true
      }
    ])

  return (
    <div id="main">

      <div id="mapDesktop" className="mapDesktop"><WorldMap size="xxl" backgroundColor="rgb(22 22 37)" color="#ff073a" data={dat} /></div>
      <div id="mobileMap" className="world"><WorldMap size="responsive" backgroundColor="rgb(22 22 37)" color="#ff073a" data={dat} /></div>

      <div id="cards">
        <div id="total" class="ci" >
          <div class="header">
            <h5> Total </h5>
          </div>
          <h4>+{card.globalNewCases}</h4>
          <div class="val">
            <h1>{card.globalTotalCases}</h1>
          </div>
        </div>
        <div id="active" class="ci">
          <div class="header">
            <h5>Active</h5>
          </div>
          <h4>&nbsp;</h4>
          <div class="val">
            <h1>{card.globalActiveCases}</h1>
          </div>
        </div>
        <div id="recovered" class="ci">
          <div class="header">
            <h5>Recovered</h5>
          </div>
          <h4>&nbsp;</h4>
          <div class="val">
            <h1>{card.globalRecoveriesSoFar}</h1>
          </div>
        </div>
        <div id="deceased" class="ci">
          <div class="header">
            <h5>Deceased</h5>
          </div>
          <div class="newDeceased">
            <h4>+{card.globalNewCasualties}</h4>
          </div>
          <div class="val">
            <h1>{card.globalTotalCasualties}</h1>
          </div>
        </div>
      </div>
      <div>
        <Styles>
          <Table defaultFiltered={[{ id: "country", value: localStorage.getItem("filter") }]} columns={columns} data={tdat} />
        </Styles>
      </div>
    </div>

  );
}

export default App;


