GET {{url}}/app/
HTTP 302
[Asserts]
header "location" == "/login"

GET {{url}}/app/
[Cookies]
session: wrong-session-cookie
HTTP 302
[Asserts]
header "location" == "/login"