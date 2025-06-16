import React, { useEffect, useRef } from "react"
import $ from "jquery"
import "datatables.net-dt"
import "../../../styles/datatables.css"
// import "datatables.net-dt/css/jquery.dataTables.css"

export function StockTable() {
  const tableRef = useRef()

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

  useEffect(() => {
    const table = $(tableRef.current).DataTable({
      data: stockData,
      pageLength: 5, // Set display limit to 5 entries
      lengthMenu: [[5], [5], [10], [10]], // Restrict page length options to only 5
      columns: [
        { title: "Company Name" },
        { title: "Ticker" },
        { title: "Stock Price" },
        { title: "Market Cap" },
      ],
      destroy: true,
      language: {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data per halaman",
        zeroRecords: "Tidak ada data yang ditemukan",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Menampilkan 0 sampai 0 dari 0 data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        paginate: {
          first: "Pertama",
          last: "Terakhir",
          next: "Selanjutnya",
          previous: "Sebelumnya",
        },
      },
    })

    // Cleanup on component unmount
    return () => {
      table.destroy()
    }
  }, []) // Empty dependency array means this effect runs only once

  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded-lg shadow">
        <table
          className="display w-full text-sm text-left text-gray-500"
          width="100%"
          ref={tableRef}
        ></table>
      </div>
    </div>
  )
}

export default StockTable
