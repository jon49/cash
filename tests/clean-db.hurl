
# Login
POST {{url}}/login
[FormParams]
email: {{email}}
password: {{password}}
HTTP 302
[Asserts]
cookie "session" exists
[Captures]
session: cookie "session"

# Clean the database by calling the URL to clean the db
POST {{url}}/app/delete-all-data/
[Cookies]
session: {{session}}
HTTP 200
[Asserts]
jsonpath "$.success" == true