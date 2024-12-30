routerAdd("get", "/{$}", e => {
    e.redirect(302, "/app/transactions/edit")
})
