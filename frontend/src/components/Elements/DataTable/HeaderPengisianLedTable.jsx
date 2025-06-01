function HeaderPengisianLedTable({ headerData }) {
  return (
    <table className="text-center rounded-lg w-full text-sm">
      <tbody>
        <tr className="border text-center w-full">
          <td className="align-middle text-center w-full" colSpan="3">
            <h4 className="font-semibold">Guidance</h4>
            <div>
              {headerData?.details
                ?.filter((detail) => detail.type === "G")
                .map((detail, index) => (
                  <div key={index}>
                    <p>{detail.reference ? detail.reference : "-"}</p>
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
                ?.filter((detail) => detail.type === "I")
                .map((detail, index) => (
                  <div key={index}>
                    <p>{detail.reference ? detail.reference : "-"}</p>
                  </div>
                ))}
            </div>
          </td>
          <td className="border w-[33%]">
            <h4 className="font-semibold">Deskripsi</h4>
            <div>
              {headerData?.details?.some((detail) => detail.type === "D") ? (
                headerData.details
                  .filter((detail) => detail.type === "D")
                  .map((detail, index) => (
                    <div key={index}>
                      <p>{detail.reference ? detail.reference : "-"}</p>
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
                ?.filter((detail) => detail.type === "E")
                .map((detail, index) => (
                  <div key={index}>
                    <p>{detail.reference ? detail.reference : "-"}</p>
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
