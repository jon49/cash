# Login
POST {{url}}/login
[FormParams]
email: {{email}}
password: {{password}}
HTTP 302
[Asserts]
cookie "session" exists
header "Location" == "/app/transactions/edit"
