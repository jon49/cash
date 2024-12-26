GET {{url}}/app/transactions/edit/
HTTP 302
[Asserts]
header "location" == "/app/categories/edit/"
