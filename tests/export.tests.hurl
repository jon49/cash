# Create a transaction which is deleted so I can make sure that it isn't included in the export
GET {{url}}/app/transactions/edit/
HTTP 200
[Captures]
category_id: xpath "string(//form//select[@name='categoryId']/option[1]/@value)"

POST {{url}}/app/transactions/edit/
[Form]
description: This will be soft deleted.
date: 2024-12-30
categoryId: {{category_id}}
amount: 10
HTTP 302
[Captures]
location: header "location"

GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//td[1]/a[contains(text(),'2024-12-30')])" exists
[Captures]
id1: xpath "string(//table//tr[1]//input[@name='id']/@value)"
id2: xpath "string(//td[contains(text(), 'This will be soft deleted.')]/ancestor-or-self::tr//input[@name='id']/@value)"

POST {{url}}/app/transactions/delete/
[Form]
id: {{id2}}
HTTP 302
[Asserts]
header "location" == "/app/transactions/"

GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "//summary" exists

# Export transactions without deleting them
GET {{url}}/app/export/
HTTP 200
[Asserts]
xpath "string(//h2)" == "Export Data"
xpath "//form[@action='/app/export/'][@method='post']" exists
xpath "//input[@name='deleteTransactions']" exists
xpath "//input[@name='deleteTransactions']/@checked" exists
xpath "//input[@type='submit']" exists

POST {{url}}/app/export/
HTTP 200
[Asserts]
header "content-disposition" contains "attachment; filename=\"cash-transactions.csv\""
body contains "Date,Description,Amount,Category"
body contains "2024-12-31,\"Out to lunch with my delightful wife.\",100,expense:Dining"
body not contains "This will be soft deleted."

# Make sure transaction wasn't deleted
GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//table//tr[1]//form/@action)" == "/app/transactions/delete/"
xpath "string(//table//tr[1]//input[@name='id']/@value)" == "{{id1}}"

# Export transactions and delete them
POST {{url}}/app/export/
[Form]
deleteTransactions: on
HTTP 200
[Asserts]
header "content-disposition" contains "attachment; filename=\"cash-transactions.csv\""
body contains "Date,Description,Amount,Category"
body contains "2024-12-31,\"Out to lunch with my delightful wife.\",100,expense:Dining"

# Make sure transaction was deleted
GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//table//tr[1]//form/@action)" == "/app/transactions/restore/"
xpath "string(//table//tr[1]//input[@name='id']/@value)" == "{{id1}}"
