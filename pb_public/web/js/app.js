function connectedCallback(ctx) {
    if (ctx.children.length) {
        ctx.init()
        return
    }

    // not yet available, watch it for _init
    let observer = new MutationObserver(() => {
        observer.disconnect()
        observer = null
        ctx.init()
    })
    observer.observe(ctx, { childList: true })
}

customElements.define("date-fill",
    class DateFill extends HTMLElement {
        connectedCallback() {
            connectedCallback(this)
        }

        init() {
            let el = this.firstElementChild
            let value = el?.value
            if (value?.length > 0) return
            let today = new Date()
            let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
            el.value = formattedDate;
        }
    })
