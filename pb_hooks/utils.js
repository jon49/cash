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
        let [whole, cents] = Math.abs(amount).toFixed(2).split(".")
        let value = `${currencySymbol}${groupThousands(whole)}.${cents}`
        return amount < 0 ? `(${value})` : value
    }
}

// PocketBase's JS runtime (goja) has no Intl support, so amount.toLocaleString()
// wouldn't add thousands separators -- do it by hand instead. (Its regex engine
// also double-inserts on zero-width lookahead matches, e.g.
// replace(/\B(?=(\d{3})+(?!\d))/g, ","), so a manual loop is used instead of that
// usual one-liner.)
function groupThousands(digits) {
    let result = ""
    let count = 0
    for (let i = digits.length - 1; i >= 0; i--) {
        result = digits[i] + result
        count++
        if (count % 3 === 0 && i !== 0) {
            result = "," + result
        }
    }
    return result
}