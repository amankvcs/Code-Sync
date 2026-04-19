import { PiCaretDownBold } from "react-icons/pi"

function Select({ onChange, value, options, title }) {
    const sortedOptions = [...options].sort((first, second) =>
        String(first).localeCompare(String(second)),
    )

    return (
        <div className="relative w-full">
            <label className="mb-2">{title}</label>
            <select
                className="w-full rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none"
                value={value}
                onChange={onChange}
            >
                {sortedOptions.map((option, index) => {
                    const value = String(option)
                    const name =
                        value.charAt(0).toUpperCase() + value.slice(1)

                    return (
                        <option key={`${value}-${index}`} value={value}>
                            {name}
                        </option>
                    )
                })}
            </select>
            <PiCaretDownBold
                size={16}
                className="absolute bottom-3 right-4 z-10 text-white"
            />
        </div>
    )
}

export default Select
