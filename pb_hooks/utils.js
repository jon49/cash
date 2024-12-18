module.exports = {
    /**
     * Capitalize the first letter.
     * @param {string} s 
     * @returns {string}
     */
    capitalize: (s) => {
        if (!s) return s
        let firstLetter = s.slice(0, 1)
        return `${firstLetter.toUpperCase()}${s.slice(1)}`
    }
}