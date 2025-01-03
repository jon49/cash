# Login
POST {{url}}/login
[Form]
email: {{email}}
password: {{password}}
HTTP 302
[Asserts]
cookie "session" exists
header "Location" == "/app/transactions/edit"
