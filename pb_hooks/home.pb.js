routerAdd("get", "/{$}", e => {
    e.redirect(302, "/app/transactions/edit")
})

routerAdd("get", "/app/", e => {
    e.redirect(302, "/app/transactions/edit")
})