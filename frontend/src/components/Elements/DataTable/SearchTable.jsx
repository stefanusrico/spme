import React, { useEffect, useRef } from "react"
import { DataTable } from "simple-datatables"
import "simple-datatables/dist/style.css"

const stockData = [
  ["Apple Inc.", "AAPL", "$192.58", "$3.04T"],
  ["Microsoft Corporation", "MSFT", "$340.54", "$2.56T"],
  ["Alphabet Inc.", "GOOGL", "$134.12", "$1.72T"],
  ["Amazon.com Inc.", "AMZN", "$138.01", "$1.42T"],
  ["NVIDIA Corporation", "NVDA", "$466.19", "$1.16T"],
  ["Tesla Inc.", "TSLA", "$255.98", "$811.00B"],
  ["Meta Platforms Inc.", "META", "$311.71", "$816.00B"],
  ["Berkshire Hathaway Inc.", "BRK.B", "$354.08", "$783.00B"],
  ["TSMC", "TSM", "$103.51", "$538.00B"],
  ["UnitedHealth Group Incorporated", "UNH", "$501.96", "$466.00B"],
  ["Johnson & Johnson", "JNJ", "$172.85", "$452.00B"],
  ["JPMorgan Chase & Co.", "JPM", "$150.23", "$431.00B"],
  ["Visa Inc.", "V", "$246.39", "$519.00B"],
  ["Eli Lilly and Company", "LLY", "$582.97", "$552.00B"],
  ["Walmart Inc.", "WMT", "$159.67", "$429.00B"],
  ["Samsung Electronics Co., Ltd.", "005930.KS", "$70.22", "$429.00B"],
  ["Procter & Gamble Co.", "PG", "$156.47", "$366.00B"],
  ["Nestlé S.A.", "NESN.SW", "$120.51", "$338.00B"],
  ["Roche Holding AG", "ROG.SW", "$296.00", "$317.00B"],
  ["Chevron Corporation", "CVX", "$160.92", "$310.00B"],
  ["LVMH Moët Hennessy Louis Vuitton", "MC.PA", "$956.60", "$478.00B"],
  ["Pfizer Inc.", "PFE", "$35.95", "$200.00B"],
  ["Novo Nordisk A/S", "NVO", "$189.15", "$443.00B"],
  ["PepsiCo, Inc.", "PEP", "$182.56", "$311.00B"],
  ["ASML Holding N.V.", "ASML", "$665.72", "$273.00B"],
  ["The Coca-Cola Company", "KO", "$61.37", "$265.00B"],
  ["Oracle Corporation", "ORCL", "$118.36", "$319.00B"],
  ["Merck & Co., Inc.", "MRK", "$109.12", "$276.00B"],
  ["Broadcom Inc.", "AVGO", "$861.80", "$356.00B"],
  ["Mastercard Incorporated", "MA", "$421.44", "$396.00B"],
]

const SearchTable = () => {
  const tableRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (tableRef.current) {
      const dataTable = new DataTable(tableRef.current, {
        searchable: true,
        sortable: false,
        perPage: 5, // Menentukan jumlah entri yang ditampilkan per halaman
      })

      if (searchRef.current) {
        searchRef.current.addEventListener("input", (e) => {
          dataTable.search(e.target.value)
        })
      }
    }
  }, [])

  return (
    <div className="container">
      <h2 className="table-title">Stock Market Data</h2>

      {/* Search Input */}
      <input
        ref={searchRef}
        type="text"
        className="search-input"
        placeholder="Search by Company Name, Ticker, Price or Market Cap"
      />

      <table id="search-table" ref={tableRef} className="styled-table">
        <thead>
          <tr>
            <th className="px-6 py-3">Company Name</th>
            <th className="px-6 py-3">Ticker</th>
            <th className="px-6 py-3">Stock Price</th>
            <th className="px-6 py-3">Market Capitalization</th>
          </tr>
        </thead>

        <tbody>
          {/* Iterasi melalui stockData untuk membuat baris tabel secara dinamis */}
          {stockData.map((stock, index) => (
            <tr key={index}>
              <td>{stock[0]}</td>
              <td>{stock[1]}</td>
              <td>{stock[2]}</td>
              <td>{stock[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SearchTable
