/* eslint-disable react/prop-types */
const CardProduct = (props) => {
  const { children, image } = props
  return (
    <div>
      <a href="#">
        <img
          className="p-8 rounded-t-lg h-80 w-full object-fill"
          src={image}
          alt="product image"
        />
      </a>
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}

const Title = (props) => {
  const { name } = props
  return (
    <a href="#">
      <h5 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
        {name.substring(0, 20)} ...
      </h5>
    </a>
  )
}
const Description = (props) => {
  const { desc } = props
  return (
    <div className="flex items-center mt-2.5 mb-5 text-justify">
      <p>{desc.substring(0, 250)} ...</p>
    </div>
  )
}
const Button = (props) => {
  const { price, handleAddToCart, id } = props
  return (
    <div className="flex items-center justify-between">
      <span className="text-3xl font-bold text-gray-900 dark:text-white">
        ${" "}
        {price.toLocaleString("id-US", { styles: "currency", currency: "USD" })}
      </span>
      <button onClick={() => handleAddToCart(id)}>
        <a
          href="#"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          Add to cart
        </a>
      </button>
    </div>
  )
}

CardProduct.Title = Title
CardProduct.Description = Description
CardProduct.Button = Button

export default CardProduct
