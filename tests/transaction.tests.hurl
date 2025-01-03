### Test the transaction flow ###

### Create a new transaction ###
GET {{url}}/app/transactions/edit/
HTTP 200
[Asserts]
xpath "string(//h2)" == "New Transaction"
xpath "string(//form/@action)" == "/app/transactions/edit/"
xpath "string(//form/@method)" == "post"
xpath "string(//form//select[@name='description']/@value)" == ""
xpath "string(//form//input[@name='date']/@value)" == ""
xpath "//form//select[@name='categoryId']/option/@value" exists
xpath "string(//form//input[@name='amount']/@value)" == ""
xpath "//form//input[@name='id']" not exists
[Captures]
category_id: xpath "string(//form//select[@name='categoryId']/option[1]/@value)"

POST {{url}}/app/transactions/edit/
[Form]
description:       Out to lunch with my wife.      
date: 2024-12-31
categoryId: {{category_id}}
amount: 100
HTTP 302
[Asserts]
header "location" == "/app/transactions/"
[Captures]
location: header "location"

GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//h2)" == "Transactions"
xpath "string(//table//tr[1]/td[1]/a)" == "2024-12-31"
xpath "string(//table//tr[1]/td[2])" == "Expense - Dining"
xpath "string(//table//tr[1]/td[3])" == "($100.00)"
xpath "string(//table//tr[1]/td[4])" == "Out to lunch with my wife."
xpath "string(//table//tr[1]/td[5]/form/@action)" == "/app/transactions/delete/"
xpath "string(//table//tfoot/tr[1])" contains "Total"
xpath "string(//table//tfoot/tr[1])" contains "($100.00)"
[Captures]
edit_page: xpath "string(//table//tr[1]/td[1]/a/@href)"

### Edit the transaction ###

GET {{url}}{{edit_page}}
HTTP 200
[Asserts]
xpath "string(//h2)" == "Edit Transaction"
xpath "string(//form/@action)" startsWith "/app/transactions/edit/"
xpath "string(//form/@method)" == "post"
[Captures]
id: xpath "string(//form//input[@name='id']/@value)"

POST {{url}}/app/transactions/edit/
[Form]
id: {{id}}
description: Out to lunch with my delightful wife.
date: 2024-12-31
categoryId: {{category_id}}
amount: 100
HTTP 302
[Asserts]
header "location" == "/app/transactions/"

GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//h2)" == "Transactions"
xpath "string(//table//tr[1]/td[1]/a)" == "2024-12-31"
xpath "string(//table//tr[1]/td[1]/a/@href)" == "/app/transactions/edit/?id={{id}}"
xpath "string(//table//tr[1]/td[2])" == "Expense - Dining"
xpath "string(//table//tr[1]/td[3])" == "($100.00)"
xpath "string(//table//tr[1]/td[4])" == "Out to lunch with my delightful wife."
xpath "string(//table//tr[1]/td[5]/form/@action)" == "/app/transactions/delete/"
xpath "string(//table//tfoot/tr[1])" contains "Total"
xpath "string(//table//tfoot/tr[1])" contains "($100.00)"

### Delete the transaction ###

POST {{url}}/app/transactions/delete/
[Form]
id: {{id}}
HTTP 302
[Asserts]
header "location" == "/app/transactions/"

GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//h2)" == "Transactions"
xpath "string(//p)" == "No active transactions found!"
xpath "string(//summary)" contains "View Deleted Transactions"
xpath "string(//tbody/tr[1]/td[1]/a)" contains "2024-12-31"
xpath "string(//table//tr[1]/td[5]/form/@action)" == "/app/transactions/restore/"
xpath "//table//tfoot" not exists

### Restore the transaction ###

POST {{url}}/app/transactions/restore/
[Form]
id: {{id}}
HTTP 302
[Asserts]
header "location" == "/app/transactions/"

GET {{url}}/app/transactions/
HTTP 200
[Asserts]
xpath "string(//h2)" == "Transactions"
xpath "string(//table//tr[1]/td[1]/a)" == "2024-12-31"
xpath "//summary" not exists
