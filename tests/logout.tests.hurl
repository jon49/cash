GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "//a[@href='/app/logout/']" exists

GET {{url}}/app/logout/
HTTP 302
[Asserts]
header "location" == "/login"
cookie "session" == ""
