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

/**
 * @param {HTMLElement} context 
 * @param {Event} event 
 */
export function handleEvent(context, event) {
    let target = event.target
    let targetAttribute = `x-${event.type}`
    if (target instanceof HTMLElement) {
        let targetQuery = `[${targetAttribute}]`
        let action
        try {
            /** @type {string | undefined | null} */
            action =
                target.querySelector(targetQuery)?.getAttribute(targetAttribute)
                || target.closest(targetQuery)?.getAttribute(targetAttribute)
        } catch (_) { }

        if (action) {
            if ((context)[action] instanceof Function) {
                stopEvent(event)
                // @ts-ignore
                context[action](event)
            } else {
                console.warn(`Action ${action} not implemented.`)
            }
        } else if ((context)[`handle${event.type}`] instanceof Function) {
            (context)[`handle${event.type}`](event)
        }
    }
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

// PicoCSS Modal
class xModal extends HTMLElement {
    /** @type {HTMLElement} */
    html
    animation = 400
    /** @type {MutationObserver|undefined} */
    observer
    /** @type {HTMLDialogElement|undefined} */
    dialog
    /** @type {HTMLElement|null} */
    box
    constructor() {
        super()
        this.html = document.documentElement
    }

    connectedCallback() {
        if (this.children.length) {
            this.init()
            return
        }

        // not yet available, watch it for _init
        this.observer = new MutationObserver(this.init.bind(this))
        this.observer.observe(this, { childList: true })
    }

    init() {
        this.html.classList.add('modal-is-open', 'modal-is-opening')
        this.dialog = this.querySelector('dialog')
        this.dialog.showModal()
        setTimeout(() => {
            this.html.classList.remove('modal-is-opening')
        }, this.animation)
        this.dialog.addEventListener('close', this)
        this.dialog.addEventListener('click', this)
        this.box = this.dialog.querySelector("[box]")
        this.addEventListener('hf:completed', this)
    }

    /** @param {Event} event */
    handleEvent(event) {
        handleEvent(this, event)
    }

    close() {
        this.handleclose()
    }

    "handlehf:completed"() {
        this.handleclose()
    }

    handleclose() {
        this.html.classList.add('modal-is-closing')
        setTimeout(() => {
            this.html.classList.remove('modal-is-open', 'modal-is-closing')
            this.dialog?.close()
            this.remove()
        }, this.animation)
    }

    /** @param {MouseEvent} e */
    handleclick(e) {
        if (!this.dialog?.open) {
            return
        }

        if (e.target instanceof HTMLButtonElement
            && e.target.value === 'cancel'
        ) {
            this.handleclose()
        }

        if (this.box?.contains(e.target)) {
            return
        }

        this.handleclose()
    }

}

window.customElements.define('x-modal', xModal)

if (location.pathname === "/app/transactions/edit/" && location.search === "" && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/app/sw.js', { updateViaCache: 'imports' }).then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }).catch(error => {
            console.log('ServiceWorker registration failed: ', error);
        });
    });
}

// Check if there are any posts that need syncing.
if (navigator?.serviceWorker?.controller) {
    const messageChannel = new MessageChannel()
    messageChannel.port1.onmessage = (event) => {
        let syncEl = document.getElementById("sync")
        if (event.data.hasPendingSync) {
            let syncButton = syncEl?.querySelector("button")
            if (!syncButton) return
            syncEl.hidden = false
            syncButton.addEventListener("click", () => {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.sync.register("syncPostRequests")
                })
            })
        } else {
            if (syncEl) {
                syncEl.hidden = true
            }
        }
    }
    navigator.serviceWorker.controller.postMessage({ type: "CHECK_SYNC_STATUS" }, [messageChannel.port2])
}
