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
    },
    formatDate: (date) => {
        return date.string().slice(0, 10)
    },
    formatMoney: (amount, currencySymbol) => {
        return amount < 0 ? `(${currencySymbol}${Math.abs(amount).toFixed(2)})` : `${currencySymbol}${amount.toFixed(2)}`
    }
}