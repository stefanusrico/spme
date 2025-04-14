function HeaderPengisianLedTable({ headerData }) {
  return (
    <table className="text-center rounded-lg w-full text-sm">
      <tbody>
        <tr className="border text-center w-full">
          <td className="align-middle text-center w-full" colSpan="3">
            <h4 className="font-semibold">Guidance</h4>
            <div>
              {headerData?.details
                ?.filter((detail) => detail.Type === "G")
                .map((detail, index) => (
                  <div key={index}>
                    <p>{detail.Reference ? detail.Reference : "-"}</p>
                  </div>
                ))}
            </div>
          </td>
        </tr>
        <tr>
          <td className="border w-[33%]">
            <h4 className="font-semibold">Indikator</h4>
            <div>
              {headerData?.details
                ?.filter((detail) => detail.Type === "I")
                .map((detail, index) => (
                  <div key={index}>
                    <p>{detail.Reference ? detail.Reference : "-"}</p>
                  </div>
                ))}
            </div>
          </td>
          <td className="border w-[33%]">
            <h4 className="font-semibold">Deskripsi</h4>
            <div>
              {headerData?.details?.some((detail) => detail.Type === "D") ? (
                headerData.details
                  .filter((detail) => detail.Type === "D")
                  .map((detail, index) => (
                    <div key={index}>
                      <p>{detail.Reference ? detail.Reference : "-"}</p>
                    </div>
                  ))
              ) : (
                <p>-</p>
              )}
            </div>
          </td>
          <td className="border">
            <h4 className="font-semibold">Elemen</h4>
            <div>
              {headerData?.details
                ?.filter((detail) => detail.Type === "E")
                .map((detail, index) => (
                  <div key={index}>
                    <p>{detail.Reference ? detail.Reference : "-"}</p>
                  </div>
                ))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export default HeaderPengisianLedTable
