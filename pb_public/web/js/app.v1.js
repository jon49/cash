function connectedCallback(ctx) {
    if (ctx.children.length) {
        ctx.init()
        return
    }

    // not yet available, watch it for _init
    ctx.observer = new MutationObserver(ctx.init.bind(ctx))
    ctx.observer.observe(ctx, { childList: true })
}

customElements.define("date-fill",
class DateFill extends HTMLElement {
    connectedCallback() {
        connectedCallback(this)
    }

    init() {
        let el = this.firstElementChild
        let value = el?.value
        if (value == null || value.length > 0) return
        let today = new Date()
        let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
        el.value = formattedDate;
    }
})

function togglePopover(el, timeout) {
    el.showPopover()
    setTimeout(() => {
        el.hidePopover()
        el.parentElement.remove()
    }, timeout)
}

customElements.define("noscript-toast", class NoScriptToast extends HTMLElement {
    connectedCallback() {
        let d = document
        let el = d.body.querySelector("noscript")
        if (!el) return
        let html = el.textContent.trim()
        if (!html) return
        let popover = d.createElement("article")
        popover.innerHTML = html
        popover.popover = "manual"
        this.append(popover)
        let wordCount = popover.textContent.split(/\s+/).length
        let timeout = 1e3 + wordCount * 400
        togglePopover(popover, timeout)
    }
})
