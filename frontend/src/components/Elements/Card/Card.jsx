// eslint-disable-next-line react/prop-types
const Card = ({ title, value }) => {
  return (
    <div className="max-w-sm p-6 bg-white border border-gray rounded-lg shadow bg-gray border-gray w-80 h-40 flex item-center flex-col justify-center">
      <h5 className="mb-2 text-lg font-light tracking-tight text-graytxt">
        {title}
      </h5>
      <p className="mb-3 text-2xl font-bold text-black">{value}</p>
    </div>
  )
}

export default Card
