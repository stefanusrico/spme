import UserDropdown from "./UserDropdown"
import NotificationDropdown from "./NotificationDropdown"

const Navbar = () => {
  return (
    <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray dark:bg-white dark:border-gray">
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start rtl:justify-end">
            <a
              href="https://www.polban.ac.id/"
              className="flex items-center ms-2 md:me-24"
            >
              <img
                src="https://www.pngfind.com/pngs/m/334-3343909_politeknik-negeri-bandung-polban-hd-png-download.png"
                className="h-12 w-12 me-3 object-contain" // Increased size and added object-contain
                alt="Logo Polban"
              />
              <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-black">
                SPME
              </span>
            </a>
          </div>
          <div className="flex items-center justify-between space-x-5">
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
