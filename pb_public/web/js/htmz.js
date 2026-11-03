// A progressively enhanced take on htmz (https://leanrada.com/htmz/).
//
// A form opts in with an `hz` attribute, on the form itself or on the button that
// submits it. Nothing in the markup points at the iframe: it, the form target and
// the hidden `_hz` field are only added here, so without this script every form is
// a plain form that does a normal round trip to the server.
//
// The server sees `_hz` and answers with fragments. Each top level element in the
// response replaces the element with the same id, or the one its `hz-target`
// selector finds; `hz-swap` names a different DOM method to use instead, e.g.
// `append` or `replaceChildren`. A response that is a whole page (it has a
// doctype), such as where a redirect ended up, is navigated to for real.

if (window === window.top) {
    let frame = document.createElement("iframe")
    frame.name = "htmz"
    frame.hidden = true
    frame.addEventListener("load", () => swap(frame))
    document.body.append(frame)

    /** @type {HTMLFormElement | undefined} */
    let source

    document.addEventListener("submit", e => {
        let form = e.target
        let submitter = e.submitter
        if (!(form instanceof HTMLFormElement)
            || ![form, submitter].some(x => x?.hasAttribute("hz"))) return

        source = form
        let input = Object.assign(document.createElement("input"), { type: "hidden", name: "_hz", value: "1" })
        form.append(input)
        // A submitter's formtarget wins over the form's target.
        let [el, attr] = submitter ? [submitter, "formtarget"] : [form, "target"]
        let old = el.getAttribute(attr)
        el.setAttribute(attr, "htmz")
        // The browser settles the form data and where it goes before this event is
        // done, so the form can be put back the way it was straight away. That keeps
        // a submit button without `hz` in the same form doing a normal submit.
        setTimeout(() => {
            input.remove()
            old == null ? el.removeAttribute(attr) : el.setAttribute(attr, old)
        })
    }, true)

    /** @param {HTMLIFrameElement} frame */
    function swap(frame) {
        let href = frame.contentWindow?.location.href
        let doc = frame.contentDocument
        if (!doc || !href || href === "about:blank") return

        if (doc.doctype) {
            reset(frame)
            location.assign(href)
            return
        }

        let swapped = []
        for (let el of [...doc.body.children, ...doc.head.children]) {
            let method = el.getAttribute("hz-swap") ?? "replaceWith"
            let query = el.getAttribute("hz-target") || (el.id && `#${el.id}`)
            let target
            try {
                target = query && document.querySelector(query)
            } catch {
                console.warn(`htmz: invalid hz-target "${query}".`, el)
                continue
            }
            if (!target) {
                console.warn("htmz: nothing on the page to swap into for", el)
                continue
            }
            el.removeAttribute("hz-swap")
            el.removeAttribute("hz-target")
            // The iframe is its own realm. Moving its nodes over as they are would
            // leave them failing `instanceof HTMLElement` and friends on this page,
            // so copy them into this document instead.
            let node = document.importNode(el.tagName === "TEMPLATE" ? el.content : el, true)
            // A template's fragment is empty once inserted, so note its children first.
            swapped.push(...(node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.childNodes : [node]))
            target[method]?.(node)
        }

        // Inserted elements don't act on autofocus the way a page load does.
        swapped
            .map(el => el.matches?.("[autofocus]") ? el : el.querySelector?.("[autofocus]"))
            .find(x => x?.isConnected)
            ?.focus()

        // Fired on the form so a listener can tell which one finished, e.g. the
        // modal closing once its own form is done. A form the swap replaced is no
        // longer on the page, so fall back to the document.
        let origin = source?.isConnected ? source : document
        source = void 0
        origin.dispatchEvent(new CustomEvent("hz:completed", { bubbles: true }))

        reset(frame)
    }

    // A fresh iframe drops the history entries the old one picked up, so the back
    // button doesn't have to step through them.
    /** @param {HTMLIFrameElement} frame */
    function reset(frame) {
        frame.remove()
        document.body.append(frame)
    }
}
